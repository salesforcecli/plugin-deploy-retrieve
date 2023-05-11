# commaWarningForTests

The previous version of this command used a comma-separated list for tests. We've changed how you specify multiple tests, so if you continue using your current syntax, your tests will probably not run as you expect.

%s

# flags.tests.summary

Apex tests to run when --test-level is RunSpecifiedTests.

# flags.tests.description

If a test name contains a space, enclose it in double quotes.
For multiple test names, use one of the following formats:

- Repeat the flag for multiple test names: --tests Test1 --tests Test2 --tests "Test With Space"
- Separate the test names with spaces: --tests Test1 Test2 "Test With Space"

# flags.coverage-formatters.summary

Format of the code coverage results.

# flags.coverage-formatters.description

For multiple formatters, repeat the flag for each formatter.
--coverage-formatters lcov --coverage-formatters clover
