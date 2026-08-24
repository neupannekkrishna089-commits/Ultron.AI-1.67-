// Entry point. All real setup lives in lib.rs (ultron_lib::run), which is
// also how mobile targets and integration tests can invoke the same app —
// not used yet, but keeps the door open without a rewrite later.
fn main() {
    ultron_lib::run();
}
