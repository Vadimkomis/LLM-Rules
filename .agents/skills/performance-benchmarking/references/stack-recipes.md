# Stack Recipes

These are routing rules, not dependency mandates. Inspect the repository and the
installed tool versions before choosing syntax.

## Tool Resolution Order

1. Reuse the project's existing benchmark framework, targets, scripts, and
   result format.
2. Use an official or established ecosystem facility already installed.
3. For unfamiliar or fast-changing tooling, consult current official
   documentation before writing commands.
4. If a development-only benchmark dependency materially improves reliability,
   explain the benefit and follow project dependency policy.
5. Use the generic harness only when no suitable framework is viable.

Never add benchmark tooling to a production artifact unintentionally. Always
ask before a production dependency.

## iOS and Swift

- For Xcode projects, prefer existing XCTest performance tests and `XCTMetric`
  support. Apple's [performance-test guidance](https://developer.apple.com/documentation/xcode/writing-and-running-performance-tests)
  recommends Release builds, representative device conditions, and disabling
  debugging, coverage, and sanitizers for accurate measurement.
- Use Instruments or `xctrace` to profile CPU, allocations, memory, launch,
  hitches, storage, signposts, and energy when those mechanisms matter.
- For Swift packages, follow the existing package benchmark convention; propose
  a benchmark package only if no supported harness exists.
- Record Xcode/Swift version, scheme, configuration, destination, OS, device
  model, power state, and thermal state.
- Treat simulator results as development signals. Use a representative physical
  device for claims about launch, UI responsiveness, memory pressure, or energy.

## Android and Kotlin/Java

- Android provides [Microbenchmark and Macrobenchmark](https://developer.android.com/topic/performance/benchmarking/benchmarking-overview).
  Use Microbenchmark for directly invoked hot code and Macrobenchmark for app
  startup, scrolling, animations, Compose UI, and other user journeys.
- Reuse the project's benchmark module, target application, build type, and
  Gradle tasks. Keep debuggable behavior out of performance claims unless it is
  the target.
- Record Android Gradle Plugin and library versions, device model, API level,
  compilation mode, animations, battery/power state, and thermal status.
- Use physical devices for release decisions. Emulator results can catch large
  regressions but do not establish device performance.
- Validate startup and UI changes with the same setup state and compilation
  mode; avoid comparing warm and cold states accidentally.

## Python

- Prefer an existing `pyperf`, `pytest-benchmark`, ASV, or project-specific
  harness. `pyperf` provides process isolation, calibration, warmups, metadata,
  stability warnings, JSON results, and comparison tools; consult its
  [current run guide](https://pyperf.readthedocs.io/en/latest/run_benchmark.html).
- Use standard-library `timeit` only for a narrow operation when adding a
  framework is unjustified. Repeat in fresh processes when interpreter or
  allocator state matters.
- Record interpreter implementation/version, virtual environment, installed
  dependencies, optimization flags, hash seed/locale when relevant, garbage
  collection policy, process count, warmups, loops, and input construction.
- Never hide pyperf instability warnings. Use its statistics and metadata to
  diagnose noise before increasing iteration counts blindly.

## Rust

- Reuse the existing Cargo benchmark target and harness. The Cargo
  [`bench` command](https://doc.rust-lang.org/cargo/commands/cargo-bench.html)
  builds the selected benchmark targets using the benchmark profile.
- Follow the installed harness's comparison and output facilities instead of
  replacing them. Propose Criterion, iai-callgrind, or another development
  dependency only when project policy and the performance question justify it.
- Use `std::hint::black_box` where appropriate to reduce unintended compiler
  elimination, while remembering it is a best-effort barrier rather than a
  correctness guarantee.
- Record Rust toolchain, target triple, feature set, benchmark profile,
  allocator, CPU, and relevant code-generation flags.
- Measure throughput and allocations as well as latency when input size or
  ownership changes are part of the hypothesis.

## TypeScript and JavaScript

- Prefer the project's existing benchmark tooling and its actual runtime. For a
  Vitest project, check the installed version before using `vitest bench`; the
  [benchmark API](https://main.vitest.dev/guide/benchmarking) has evolved and
  may use a dedicated benchmark project and context fixture.
- Other viable existing choices include Tinybench, Benchmark.js, browser
  performance tooling, and Node's
  [`perf_hooks`](https://nodejs.org/api/perf_hooks.html) APIs.
- Match the production transformation: TypeScript compilation, bundling,
  minification, module format, runtime flags, and browser/Node version.
- Warm JIT paths, consume outputs, separate async submission from completion,
  and account for event-loop work, garbage collection, hidden caches, workers,
  and benchmark ordering.
- Use the target browser/device for DOM, rendering, interaction, or bundle-load
  claims. Node microbenchmarks cannot establish browser UI performance.

## Unknown or Unlisted Stack

1. Detect compiler/interpreter, build system, test runner, target runtime,
   package manifests, CI commands, and files named for benchmark/perf/profile.
2. Inspect existing dependencies and scripts for a benchmark facility.
3. Search current official language, runtime, or framework documentation. Use
   primary sources and record the selected version.
4. Map the shared performance contract from `methodology.md` onto that tool.
5. If no framework is viable, create a minimal harness with:
   - a monotonic high-resolution clock;
   - setup outside timing unless setup is the target;
   - runtime-specific warmup;
   - calibrated loops and independent samples;
   - deterministic representative inputs;
   - result consumption and correctness validation;
   - explicit environment and revision capture;
   - raw machine-readable samples when practical.
6. Run the harness against an intentional slow control or a known workload-size
   change to confirm it detects a real performance difference.
7. Record the project-specific recipe. Propose promoting it to this reference
   only through `continuous-improvement.md`.

Stop as `blocked` rather than guessing when the toolchain, device, permission,
or representative data is unavailable.
