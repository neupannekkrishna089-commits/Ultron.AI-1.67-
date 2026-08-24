// ULTRON desktop backend — foundation phase only.
//
// Responsible for: window chrome (custom titlebar controls), the system
// tray, the OS-level global shortcut (with graceful fallback if Windows has
// already reserved the requested combo), SQLite bootstrap, and structured
// logging. No AI, no computer-control, no network calls live here yet —
// this is intentionally just the desktop shell.

use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Manager, State, WindowEvent};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_sql::{Migration, MigrationKind};

/// Reported to the frontend whenever a global-shortcut registration is
/// attempted, so Settings can show the user exactly what happened rather
/// than silently failing.
#[derive(Clone, Serialize, Deserialize)]
pub struct ShortcutStatus {
    pub requested: String,
    pub registered: bool,
    pub error: Option<String>,
}

struct ShortcutState_ {
    current: Mutex<Option<Shortcut>>,
    last_status: Mutex<Option<ShortcutStatus>>,
}

const DEFAULT_COMBO: &str = "Super+U"; // the intended Win+U
const DEFAULT_LABEL: &str = "Win+U";

fn parse_combo(combo: &str) -> Result<Shortcut, String> {
    let mut modifiers = Modifiers::empty();
    let mut code: Option<Code> = None;

    for raw in combo.split('+') {
        let token = raw.trim();
        match token.to_ascii_lowercase().as_str() {
            "ctrl" | "control" | "commandorcontrol" => modifiers |= Modifiers::CONTROL,
            "alt" | "option" => modifiers |= Modifiers::ALT,
            "shift" => modifiers |= Modifiers::SHIFT,
            "super" | "win" | "windows" | "meta" | "cmd" | "command" => modifiers |= Modifiers::SUPER,
            "" => {}
            key => code = Some(parse_key(key).ok_or_else(|| format!("Unsupported key: {token}"))?),
        }
    }

    let code = code.ok_or_else(|| "No non-modifier key in shortcut".to_string())?;
    Ok(Shortcut::new(Some(modifiers), code))
}

/// Maps a plain key label (as produced by the frontend's shortcut recorder)
/// to a physical key `Code`. Covers the common cases for this phase —
/// letters, digits, space, arrows, and function keys. Anything else is
/// reported back as "unsupported" rather than silently failing.
fn parse_key(key: &str) -> Option<Code> {
    match key {
        " " | "space" => Some(Code::Space),
        "arrowup" | "up" => Some(Code::ArrowUp),
        "arrowdown" | "down" => Some(Code::ArrowDown),
        "arrowleft" | "left" => Some(Code::ArrowLeft),
        "arrowright" | "right" => Some(Code::ArrowRight),
        "enter" | "return" => Some(Code::Enter),
        "tab" => Some(Code::Tab),
        "escape" | "esc" => Some(Code::Escape),
        "backspace" => Some(Code::Backspace),
        k if k.len() == 1 => {
            let c = k.chars().next().unwrap();
            if c.is_ascii_alphabetic() {
                let upper = c.to_ascii_uppercase();
                Code::from_str_lossy_letter(upper)
            } else if c.is_ascii_digit() {
                Code::from_str_lossy_digit(c)
            } else {
                None
            }
        }
        k if k.starts_with('f') && k[1..].parse::<u8>().is_ok() => {
            let n: u8 = k[1..].parse().ok()?;
            Code::from_function_key(n)
        }
        _ => None,
    }
}

// Small helper trait extensions so parse_key stays readable above — Code has
// no built-in "from letter char" constructor.
trait CodeExt {
    fn from_str_lossy_letter(c: char) -> Option<Code>;
    fn from_str_lossy_digit(c: char) -> Option<Code>;
    fn from_function_key(n: u8) -> Option<Code>;
}
impl CodeExt for Code {
    fn from_str_lossy_letter(c: char) -> Option<Code> {
        use Code::*;
        Some(match c {
            'A' => KeyA, 'B' => KeyB, 'C' => KeyC, 'D' => KeyD, 'E' => KeyE,
            'F' => KeyF, 'G' => KeyG, 'H' => KeyH, 'I' => KeyI, 'J' => KeyJ,
            'K' => KeyK, 'L' => KeyL, 'M' => KeyM, 'N' => KeyN, 'O' => KeyO,
            'P' => KeyP, 'Q' => KeyQ, 'R' => KeyR, 'S' => KeyS, 'T' => KeyT,
            'U' => KeyU, 'V' => KeyV, 'W' => KeyW, 'X' => KeyX, 'Y' => KeyY,
            'Z' => KeyZ,
            _ => return None,
        })
    }
    fn from_str_lossy_digit(c: char) -> Option<Code> {
        use Code::*;
        Some(match c {
            '0' => Digit0, '1' => Digit1, '2' => Digit2, '3' => Digit3, '4' => Digit4,
            '5' => Digit5, '6' => Digit6, '7' => Digit7, '8' => Digit8, '9' => Digit9,
            _ => return None,
        })
    }
    fn from_function_key(n: u8) -> Option<Code> {
        use Code::*;
        Some(match n {
            1 => F1, 2 => F2, 3 => F3, 4 => F4, 5 => F5, 6 => F6,
            7 => F7, 8 => F8, 9 => F9, 10 => F10, 11 => F11, 12 => F12,
            _ => return None,
        })
    }
}

fn apply_shortcut(app: &AppHandle, combo: &str, label: &str) -> ShortcutStatus {
    let state: State<ShortcutState_> = app.state();
    let gs = app.global_shortcut();

    // Drop whatever is currently registered before trying the new one, so
    // switching combos in Settings never leaves a stale hotkey behind.
    if let Some(prev) = state.current.lock().unwrap().take() {
        let _ = gs.unregister(prev);
    }

    let status = match parse_combo(combo) {
        Ok(shortcut) => match gs.register(shortcut) {
            Ok(()) => {
                *state.current.lock().unwrap() = Some(shortcut);
                log::info!("Global shortcut registered: {label}");
                ShortcutStatus { requested: label.to_string(), registered: true, error: None }
            }
            Err(err) => {
                log::warn!("Global shortcut '{label}' rejected by the OS: {err}");
                ShortcutStatus {
                    requested: label.to_string(),
                    registered: false,
                    error: Some(err.to_string()),
                }
            }
        },
        Err(err) => {
            log::warn!("Could not parse shortcut '{label}': {err}");
            ShortcutStatus { requested: label.to_string(), registered: false, error: Some(err) }
        }
    };

    *state.last_status.lock().unwrap() = Some(status.clone());
    let _ = app.emit("ultron://shortcut-status", &status);
    status
}

#[tauri::command]
fn set_global_shortcut(app: AppHandle, combo: String, label: String) -> ShortcutStatus {
    apply_shortcut(&app, &combo, &label)
}

#[tauri::command]
fn get_shortcut_status(state: State<ShortcutState_>) -> ShortcutStatus {
    state
        .last_status
        .lock()
        .unwrap()
        .clone()
        .unwrap_or(ShortcutStatus {
            requested: DEFAULT_LABEL.to_string(),
            registered: false,
            error: None,
        })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "create kv_store",
        // Deliberately a simple key/value table for this foundation phase —
        // conversations/settings are stored as JSON blobs, mirroring the old
        // localStorage shape. A normalized schema is later work once
        // Conversation Manager / Memory / Knowledge Vault actually exist.
        sql: "CREATE TABLE IF NOT EXISTS kv_store (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at INTEGER NOT NULL
              );",
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:ultron.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_global_shortcut::Builder::new()
            .with_handler(|app, _shortcut, event| {
                if event.state() == ShortcutState::Pressed {
                    if let Some(win) = app.get_webview_window("main") {
                        let _ = win.show();
                        let _ = win.unminimize();
                        let _ = win.set_focus();
                    }
                    let _ = app.emit("ultron://activate-composer", ());
                }
            })
            .build())
        .manage(ShortcutState_ {
            current: Mutex::new(None),
            last_status: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![set_global_shortcut, get_shortcut_status])
        .setup(|app| {
            log::info!("ULTRON starting up (desktop foundation phase)");

            // Attempt the intended default (Win+U) once at startup. Windows
            // reserves this combination for Ease of Access on some systems —
            // if registration fails, we log it, report it to the frontend,
            // and leave the shortcut configurable rather than forcing it.
            apply_shortcut(app.handle(), DEFAULT_COMBO, DEFAULT_LABEL);

            // System tray: left-click toggles the window, menu offers a
            // clean quit. Keeping ULTRON reachable from the tray even when
            // the window is hidden is the whole point of the tray existing.
            let show_item = MenuItem::with_id(app, "show", "Show ULTRON", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit ULTRON", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().cloned().unwrap())
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        log::info!("Quit requested from tray menu");
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { button, button_state, .. } = event {
                        if button == tauri::tray::MouseButton::Left
                            && button_state == tauri::tray::MouseButtonState::Up
                        {
                            let app = tray.app_handle();
                            if let Some(win) = app.get_webview_window("main") {
                                let visible = win.is_visible().unwrap_or(false);
                                if visible {
                                    let _ = win.hide();
                                } else {
                                    let _ = win.show();
                                    let _ = win.set_focus();
                                }
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the window hides it to the tray instead of exiting —
            // standard behavior for an always-available assistant. Quitting
            // for real only happens via the tray's "Quit ULTRON".
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running the ULTRON application");
}
