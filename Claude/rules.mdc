---
description: 
globs: 
alwaysApply: false
---
# Global Cursor Rules

### Code Organization
- Each function/method should do one thing well
- Break complex logic into smaller, testable components
- Keep files focused on a single responsibility
- Maximum function length: 30 lines
- Use consistent naming conventions across projects

### Documentation
- Every public function/component must have a documentation comment
- Include parameter types and return values in documentation
- Document complex algorithms with clear explanations
- Add TODOs for incomplete code with ticket numbers if applicable

### Error Handling
- Never silently catch errors without proper handling
- Log meaningful error messages with context
- Validate inputs at function boundaries
- Use appropriate error propagation mechanisms

## Security 

### Security Practices
- Never hardcode sensitive information (API keys, passwords)
- Sanitize user inputs to prevent injection attacks
- Validate all external data before processing
- Implement proper authentication/authorization checks

### Performance
- Minimize nested loops and recursion
- Be mindful of memory usage and potential leaks
- Watch for unnecessary re-renders and recalculations
- Cache expensive operations where appropriate

## Testing

### Test Structure
- Group tests logically by functionality
- Keep test files alongside the code they test
- Name tests descriptively to document behavior
- Separate unit, integration, and end-to-end tests

### Test Coverage
- Aim for 80%+ coverage of business logic
- Test boundary conditions and edge cases
- Include negative test cases (error states)
- Test asynchronous code with proper awaits/promises
- Cover critical user paths completely

### Test Quality
- Each test should verify one concept
- Avoid test interdependence
- Mock external dependencies consistently
- Use setup/teardown for common test state
- Keep tests fast and deterministic

### Test Maintenance
- Refactor tests when refactoring implementation
- Use test data factories/builders for complex objects
- Extract reusable test utilities for common operations
- Update tests when requirements change
- Document testing gaps when full coverage isn't feasible

### Test-Driven Development
- Write failing tests before implementation
- Refactor after tests pass
- Use tests to document expected behavior
- Test behavior, not implementation details

### Mocking
- Mock external services and APIs
- Use appropriate mocking tools for your language
- Create realistic test fixtures
- Reset mocks between tests
- Verify mock interactions when relevant
