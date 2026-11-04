// Runs before every test file: fixed test-only settings (never touches your real database)
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-used-only-by-the-test-suite";
