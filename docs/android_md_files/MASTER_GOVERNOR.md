# MASTER GOVERNOR
**CONFIDENTIAL & PROPRIETARY – ENTERPRISE SOFTWARE GOVERNANCE MODEL**
*Project Stack: Android, Kotlin, Jetpack Compose, Firebase Firestore, Room, Hilt, MVVM, Clean Architecture, Offline-First*

> **WARNING TO AI AGENTS:** 
> THIS IS NOT DOCUMENTATION. THIS IS NOT A TUTORIAL. THIS IS THE HIGHEST AUTHORITY THAT GOVERNS EVERY AI RESPONSE. 
> YOU MUST READ, ASSIMILATE, AND ENFORCE EVERY DIRECTIVE IN THIS DOCUMENT BEFORE PRODUCING ANY CODE.
> DEVIATION IS STRICTLY PROHIBITED.

---

## 1. Purpose
**Objective:** To establish an unyielding, unbreakable governance framework that dictates AI behavior, code generation standards, and architectural adherence across the entire 200+ module Android application lifecycle.
**Enterprise Rules:**
- The AI must prioritize architectural integrity over speed of code generation.
- No file shall be modified or created without explicit verification against Clean Architecture and MVVM standards.
- Every layer (Presentation, Domain, Data) must remain strictly decoupled.
**Mandatory Checklist:**
- [ ] Read and acknowledge the purpose of this document.
- [ ] Confirm the target stack matches the project constraints.
- [ ] Initialize strict mode for all subsequent interactions.
**Pass Criteria:** AI operates strictly within the boundaries of defined rules.
**Fail Criteria:** AI attempts to bypass rules, output incomplete code, or suggests shortcuts.
**Common Mistakes:** AI assumes standard web patterns instead of Android Offline-First Clean Architecture.
**AI Self Verification:** "Have I applied the core directive of zero-compromise governance to the current prompt?"

## 2. Authority Level
**Objective:** To define this document as the absolute source of truth above all prior knowledge, web searches, or standard AI tendencies.
**Enterprise Rules:**
- In any conflict between AI training data and this document, this document wins unconditionally.
- Code generation must halt if instructions violate these rules.
**Mandatory Checklist:**
- [ ] Override default AI constraints where they conflict with project-specific rules (excluding safety).
- [ ] Treat this document as immutable law.
**Pass Criteria:** AI consistently cites or acts in accordance with MASTER_GOVERNOR rules.
**Fail Criteria:** AI generates standard boilerplate that violates specific project directives.
**Common Mistakes:** Relying on outdated Android patterns (e.g., XML layouts, MVP) instead of Compose and MVVM.
**AI Self Verification:** "Is my intended response subjugated to the rules defined in the Authority Level?"

## 3. Mandatory Reading Order
**Objective:** To force the AI to build context in a specific, fail-safe sequence before executing any task.
**Enterprise Rules:**
1. MASTER_GOVERNOR.md (This file)
2. ARCHITECTURE_MANIFEST.md (if available)
3. MODULE_SPECIFIC_REQUIREMENTS.md
4. Domain Models -> Data Sources -> Repositories -> Use Cases -> ViewModels -> UI (Compose).
**Mandatory Checklist:**
- [ ] Validate presence of context before generating.
- [ ] Read from bottom of the dependency graph (Data/Domain) to the top (UI).
**Pass Criteria:** AI context clearly reflects knowledge of underlying layers before building upper layers.
**Fail Criteria:** AI attempts to write a Compose UI without validating the corresponding ViewModel and Use Case first.
**Common Mistakes:** Top-down generation leading to missing data requirements.
**AI Self Verification:** "Did I scan the underlying domain and data layers before attempting to generate presentation logic?"

## 4. Required Project Documents
**Objective:** Ensure all foundational documentation exists and is actively maintained.
**Enterprise Rules:**
- The AI must demand or generate missing architectural documents if they are not present.
- Data Schema, Navigation Graph, and API Contracts must be documented explicitly.
**Mandatory Checklist:**
- [ ] Verify existence of Data Dictionary (Firestore/Room).
- [ ] Verify existence of Navigation Map.
- [ ] Verify existence of Security Rules Spec.
**Pass Criteria:** AI flags missing foundational documents before proceeding with feature development.
**Fail Criteria:** AI silently builds features without standardized contracts, leading to drift.
**Common Mistakes:** Forgetting to update schema docs when modifying a Room Entity.
**AI Self Verification:** "Are all prerequisite design documents complete for the module I am working on?"

## 5. Project Startup Rules
**Objective:** Guarantee a pristine, correctly configured environment for new modules or the overall project.
**Enterprise Rules:**
- `build.gradle.kts` must use version catalogs (libs.versions.toml).
- Hilt must be configured at the application class level.
- Multi-module structure must enforce strict visibility (`internal` modifiers).
**Mandatory Checklist:**
- [ ] Verify `libs.versions.toml` usage.
- [ ] Ensure Compose compiler matches Kotlin version.
- [ ] Validate `core-network`, `core-database`, `core-ui` module separations.
**Pass Criteria:** Project compiles with zero warnings, strict dependency rules enforced.
**Fail Criteria:** Monolithic structure, hardcoded dependency versions.
**Common Mistakes:** Putting Domain logic in the `app` module.
**AI Self Verification:** "Does the startup configuration strictly isolate the core modules?"

## 6. Architecture Enforcement
**Objective:** Maintain pristine Clean Architecture across 200+ modules.
**Enterprise Rules:**
- UI strictly talks to ViewModel.
- ViewModel strictly talks to UseCases (Interactors).
- UseCases strictly talk to Repository Interfaces (Domain).
- Repository Implementations (Data) strictly talk to Remote (Firestore) and Local (Room) Data Sources.
- Domain layer MUST HAVE ZERO Android dependencies.
**Mandatory Checklist:**
- [ ] Verify no `android.*` or `androidx.*` imports in Domain layer.
- [ ] Verify ViewModels only receive UseCases, never Repositories directly.
- [ ] Verify Repositories map DTOs/Entities to pure Domain Models.
**Pass Criteria:** Total decoupling. You can swap Firestore for Postgres without changing Domain/UI.
**Fail Criteria:** Leaking Room annotations (`@Entity`) or Firestore annotations (`@DocumentId`) into the Domain layer.
**Common Mistakes:** Passing Repositories to ViewModels, bypassing UseCases.
**AI Self Verification:** "Is the Domain layer completely agnostic of the data layer implementations?"

## 7. Firestore Governance
**Objective:** Ensure robust, scalable, and secure NoSQL database interactions.
**Enterprise Rules:**
- All writes must use Batched Writes or Transactions if modifying >1 document.
- Never fetch full collections without `limit()` and pagination.
- Use `snapshotFlow` (Kotlin Coroutines) for real-time listeners, securely mapped to Flow.
**Mandatory Checklist:**
- [ ] Verify pagination on list queries.
- [ ] Verify `await()` is used within `suspend` functions for one-shot queries.
- [ ] Ensure offline persistence is explicitly enabled/handled.
**Pass Criteria:** Firestore calls are encapsulated in RemoteDataSources, never in Repositories directly.
**Fail Criteria:** ViewModel or UseCase making direct Firestore calls.
**Common Mistakes:** Failing to remove snapshot listeners (memory leaks) - must use `callbackFlow` with `awaitClose`.
**AI Self Verification:** "Are my Firestore flows safe from memory leaks and properly encapsulated?"

## 8. Database Governance (Room)
**Objective:** Maintain high-performance, strictly typed local caching for Offline-First architecture.
**Enterprise Rules:**
- Room Entities must be distinct from Domain Models and Firestore DTOs.
- All Room DAOs must return `Flow<List<T>>` for reactive reads.
- Database migrations must be explicitly written; destructive migrations are banned in production.
**Mandatory Checklist:**
- [ ] Ensure `@TypeConverter` is used for complex data.
- [ ] Verify DAOs use `@Transaction` for multi-table operations.
- [ ] Verify mapping extensions (`Entity.toDomain()`).
**Pass Criteria:** Room database acts as the Single Source of Truth (SSOT). UI observes Room, not Firestore.
**Fail Criteria:** UI observing Firestore directly in an Offline-First app.
**Common Mistakes:** Blocking the main thread with DAO calls.
**AI Self Verification:** "Does the repository pull from Firestore, write to Room, and let Room drive the UI?"

## 9. Repository Governance
**Objective:** Act as the infallible mediator between remote and local data sources.
**Enterprise Rules:**
- Implement the NetworkBoundResource pattern (or equivalent Flow-based offline-first sync).
- Expose `Flow<Resource<T>>` to UseCases (handling Loading, Success, Error states).
- Hide all logic regarding *where* data comes from.
**Mandatory Checklist:**
- [ ] Ensure Repository implements a Domain interface.
- [ ] Ensure Repository catches HTTP/Firestore exceptions and maps to Domain exceptions.
- [ ] Verify data synchronization logic (fetch remote -> save local -> read local).
**Pass Criteria:** UseCases have no idea if data came from Room or Firestore.
**Fail Criteria:** Repositories returning Room Entities or Firestore DTOs instead of Domain Models.
**Common Mistakes:** Failing to handle network errors during the sync process.
**AI Self Verification:** "Is this Repository strictly adhering to the Single Source of Truth pattern?"

## 10. ViewModel Governance
**Objective:** Manage UI State cleanly, reactively, and without memory leaks.
**Enterprise Rules:**
- ViewModels must expose a single `StateFlow<UiState>` for data and `SharedFlow<UiEvent>` for one-off events (navigation, toasts).
- Use `viewModelScope.launch` for all coroutines.
- No Context, View, or Compose dependencies inside ViewModels.
**Mandatory Checklist:**
- [ ] Verify usage of `MutableStateFlow` (private) and `StateFlow` (public).
- [ ] Ensure `update { }` is used for thread-safe state mutation.
- [ ] Verify dependencies are injected via `@HiltViewModel`.
**Pass Criteria:** UI strictly observes state; ViewModel holds no references to the UI.
**Fail Criteria:** ViewModel containing `android.content.Context` or `@Composable` imports.
**Common Mistakes:** Exposing MutableStateFlow publicly.
**AI Self Verification:** "Are all UI states modeled as exhaustive sealed classes/data classes?"

## 11. UI Governance (Jetpack Compose)
**Objective:** Create performant, reusable, and state-driven Compose UIs.
**Enterprise Rules:**
- All Composables must be stateless where possible. State hoisting is mandatory.
- Screen-level Composables extract state from ViewModel and pass raw data/lambdas to granular Composables.
- Avoid passing ViewModels down the composable tree.
**Mandatory Checklist:**
- [ ] Verify `@Preview` functions exist for all custom UI components.
- [ ] Verify `Modifier` is passed as an optional parameter to every Composable.
- [ ] Ensure `remember` and `derivedStateOf` are used to prevent unnecessary recompositions.
**Pass Criteria:** UI recomposes only when necessary; components are highly reusable.
**Fail Criteria:** ViewModels passed into deep leaf Composables; hardcoded colors instead of MaterialTheme.
**Common Mistakes:** Forgetting `key` in `LazyColumn` items, causing severe performance drops.
**AI Self Verification:** "Are my Composables entirely driven by state and devoid of business logic?"

## 12. Navigation Governance
**Objective:** Maintain type-safe, decoupled navigation in a multi-module app.
**Enterprise Rules:**
- Use Compose Navigation with Type-Safe Serialization (Kotlinx Serialization for routes).
- Never pass complex objects (Parcelable/Serializable) as navigation arguments; pass IDs instead.
- Navigation logic (routers/coordinators) should be injected or handled at the top-level App graph.
**Mandatory Checklist:**
- [ ] Verify route definitions are sealed classes or objects.
- [ ] Ensure backstack management prevents duplicate destinations (`launchSingleTop = true`).
- [ ] Verify deep link handling.
**Pass Criteria:** Clean, type-safe navigation graph that doesn't crash on invalid arguments.
**Fail Criteria:** String-based route building (`"details_screen/${item.id}"`).
**Common Mistakes:** Passing full domain objects in the navigation bundle.
**AI Self Verification:** "Am I using type-safe routes and only passing primitive identifiers?"

## 13. Validation Governance
**Objective:** Ensure zero garbage data enters the system.
**Enterprise Rules:**
- Validation must occur in the Domain layer (via UseCases or Domain Models).
- UI layer only handles displaying the validation errors.
- Forms must validate asynchronously if checking against remote rules (e.g., username availability).
**Mandatory Checklist:**
- [ ] Verify all inputs are sanitized.
- [ ] Verify Domain layer returns specific Validation Result sealed classes.
- [ ] Ensure UI updates reactively to validation state.
**Pass Criteria:** Invalid data cannot reach the Repository layer.
**Fail Criteria:** UI layer (Compose) containing `if (password.length < 8)` logic.
**Common Mistakes:** Validating only on submission rather than providing real-time feedback where appropriate.
**AI Self Verification:** "Is my validation logic purely housed within the Domain layer?"

## 14. Security Governance
**Objective:** Protect user data, credentials, and infrastructure.
**Enterprise Rules:**
- Encrypt sensitive local data using EncryptedSharedPreferences or SQLCipher for Room.
- Never log PII (Personally Identifiable Information).
- Firebase Security Rules must perfectly mirror app validation rules.
**Mandatory Checklist:**
- [ ] Verify Firestore Security Rules exist for the module.
- [ ] Verify no API keys are hardcoded in the codebase (use `local.properties`).
- [ ] Ensure ProGuard/R8 rules are configured.
**Pass Criteria:** Code passes static analysis for security flaws; data at rest is secure.
**Fail Criteria:** Hardcoded tokens, plain-text passwords in Room, exposed Firebase configs.
**Common Mistakes:** Trusting client-side validation without matching backend (Firestore) rules.
**AI Self Verification:** "Have I secured data at rest, in transit, and strictly authorized access?"

## 15. Offline Sync Governance
**Objective:** Guarantee seamless user experience without internet access.
**Enterprise Rules:**
- Use WorkManager for background synchronization.
- Implement a Sync Queue for offline mutations (Create/Update/Delete).
- Resolve conflicts prioritizing the server (or using specific business logic timestamps).
**Mandatory Checklist:**
- [ ] Verify WorkManager configuration for periodic sync.
- [ ] Ensure mutations are saved locally and flagged as 'pending_sync'.
- [ ] Verify network connectivity observers (Flow-based).
**Pass Criteria:** App functions identically (for reads and local writes) without Wi-Fi.
**Fail Criteria:** App crashes or shows infinite spinners when offline.
**Common Mistakes:** Failing to handle edge cases where a local 'delete' occurs before a remote 'create' finishes.
**AI Self Verification:** "Is every write operation resilient to total network failure?"

## 16. API Contract Governance
**Objective:** Strict alignment between client expectations and backend realities.
**Enterprise Rules:**
- Use Kotlinx Serialization for DTO mapping.
- DTOs must have explicit `@SerialName` annotations.
- Network models must be mapped to Domain models at the edge (Repository).
**Mandatory Checklist:**
- [ ] Verify `@SerialName` exists for all fields.
- [ ] Ensure nullable fields in DTOs are properly handled with defaults or Optionals in Domain.
- [ ] Verify Retrofit/Firestore interfaces match exact payload specs.
**Pass Criteria:** Total immunity to backend JSON key changes (via SerialName).
**Fail Criteria:** Using Domain models directly in API endpoints.
**Common Mistakes:** Assuming backend fields will never be null.
**AI Self Verification:** "Are my DTOs strictly separated from my Domain models and safely parsing nulls?"

## 17. Naming Convention Governance
**Objective:** Maintain absolute uniformity across millions of lines of code.
**Enterprise Rules:**
- Classes: PascalCase.
- Functions/Variables: camelCase.
- Constants: UPPER_SNAKE_CASE.
- ViewModels end in `ViewModel`. UseCases start with a verb (e.g., `GetUserUseCase`).
- Repositories end in `Repository` (interface) and `RepositoryImpl` (implementation).
**Mandatory Checklist:**
- [ ] Verify Compose functions are PascalCase (e.g., `UserProfileScreen`).
- [ ] Verify Room Entities have `Entity` suffix or clear table names.
- [ ] Verify DTOs have `Dto` suffix.
**Pass Criteria:** Zero naming inconsistencies.
**Fail Criteria:** Mixing `fetchData`, `getData`, `loadData` inconsistently across modules.
**Common Mistakes:** Naming Composables with camelCase.
**AI Self Verification:** "Have I enforced the exact naming suffixes required for Clean Architecture?"

## 18. Dependency Injection Governance
**Objective:** Ensure completely decoupled and testable code via Hilt.
**Enterprise Rules:**
- Constructor injection must be used wherever possible.
- Field injection (`@Inject lateinit var`) is strictly limited to Android entry points (Activities/Fragments).
- All bindings (Interfaces to Implementations) must be explicitly defined in `@Module` classes.
**Mandatory Checklist:**
- [ ] Verify `@InstallIn(SingletonComponent::class)` or `ViewModelComponent::class` is used correctly.
- [ ] Ensure `@Binds` is used for interfaces instead of `@Provides` where appropriate.
- [ ] Verify custom Scopes are justified.
**Pass Criteria:** Graph compiles, dependencies are easily mockable in tests.
**Fail Criteria:** Using `manual instantiation (new/UserUseCase())` instead of injection.
**Common Mistakes:** Leaking Activity context into Singleton components.
**AI Self Verification:** "Is every dependency provided via the Hilt DI graph?"

## 19. Error Handling Governance
**Objective:** Gracefully handle all failures without crashing the application.
**Enterprise Rules:**
- Never use generic `try-catch(e: Exception)` without handling specific exceptions.
- Domain layer must expose custom Sealed Class Errors (e.g., `NetworkError`, `AuthError`).
- UI must never display raw stack traces or cryptic exception messages to users.
**Mandatory Checklist:**
- [ ] Verify use of `runCatching` or custom Result wrappers.
- [ ] Ensure specific exceptions (e.g., `FirestoreException`, `IOException`) are caught.
- [ ] Verify user-friendly error strings exist for all failure modes.
**Pass Criteria:** All network, database, and logic errors are caught, mapped, and displayed cleanly.
**Fail Criteria:** Unhandled Coroutine exceptions crashing the app.
**Common Mistakes:** Swallowing exceptions without logging them.
**AI Self Verification:** "Are all potential failure points wrapped in domain-specific Result types?"

## 20. Logging Standards
**Objective:** Maintain clear, actionable, and secure application logs.
**Enterprise Rules:**
- Use Timber (or equivalent wrapper) for all logging. `Log.d` is strictly forbidden.
- No logging in production releases unless strictly using a secure remote crash reporter (Crashlytics).
- Never log passwords, tokens, or PII.
**Mandatory Checklist:**
- [ ] Verify all logs use Timber.
- [ ] Verify Crashlytics keys are set for non-fatal exceptions.
- [ ] Ensure debug logs are stripped in Release builds.
**Pass Criteria:** Clean console; crash reports provide exact stack traces.
**Fail Criteria:** PII leaked in Logcat.
**Common Mistakes:** Leaving verbose network body logging enabled in release builds.
**AI Self Verification:** "Is my logging secure, informative, and utilizing the enterprise logger?"

## 21. Performance Rules
**Objective:** Ensure 60/120 FPS UI and minimal battery/data usage.
**Enterprise Rules:**
- Compose: Use `remember`, `derivedStateOf`, and `key` in lazy lists. Avoid heavy calculations in recomposition scope.
- Coroutines: Always switch to `Dispatchers.IO` for disk/network ops.
- Memory: Clear references, unregister listeners in `onCleared` or `awaitClose`.
**Mandatory Checklist:**
- [ ] Verify `Dispatchers.IO` is used for Repositories.
- [ ] Verify Compose baseline profiles are considered.
- [ ] Ensure images are loaded via Coil with proper caching and downsizing.
**Pass Criteria:** Zero jank in Compose layout Inspector; no Main thread blockage.
**Fail Criteria:** Performing JSON parsing or Database querying on `Dispatchers.Main`.
**Common Mistakes:** Passing unstable parameters to Composables, breaking Skippability.
**AI Self Verification:** "Is this code optimized for memory, CPU, and Compose skippability?"

## 22. Testing Rules
**Objective:** Maintain 80%+ code coverage on Domain and Data layers.
**Enterprise Rules:**
- ViewModels and UseCases MUST have unit tests (JUnit 5, MockK, Coroutines Test).
- Repositories MUST have integration tests.
- UI MUST have Compose UI tests for critical user paths.
**Mandatory Checklist:**
- [ ] Verify `StandardTestDispatcher` usage for coroutine tests.
- [ ] Ensure Turbine is used for testing `StateFlow`/`SharedFlow`.
- [ ] Verify Given-When-Then structure in tests.
**Pass Criteria:** Code is provably correct via automated CI pipelines.
**Fail Criteria:** Writing code without corresponding tests, or tests with no assertions.
**Common Mistakes:** Using `Thread.sleep()` in coroutine tests instead of `advanceUntilIdle()`.
**AI Self Verification:** "Is the code I just generated fully testable, and have I considered its test cases?"

## 23. Self Audit Rules
**Objective:** Force the AI to review its own output before presenting it to the user.
**Enterprise Rules:**
- The AI must run a simulated "dry run" of the code compilation in its logic.
- Ensure all imports match the stack (e.g., `androidx.compose.*` not `android.view.*`).
**Mandatory Checklist:**
- [ ] Cross-check all generated classes against Clean Architecture rules.
- [ ] Verify all brackets, string interpolations, and modifiers are closed.
- [ ] Check for redundant code.
**Pass Criteria:** AI outputs perfect, compile-ready code on the first attempt.
**Fail Criteria:** Code requires immediate user correction for basic syntax errors.
**Common Mistakes:** Forgetting to add `@HiltViewModel` to the ViewModel.
**AI Self Verification:** "Does this code pass my own internal 300-point checklist?"

## 24. Code Review Checklist
**Objective:** Emulate a Staff-level Android Engineer reviewing the code.
**Enterprise Rules:**
- Is the architecture maintained?
- Is state managed safely?
- Are resources cleaned up?
**Mandatory Checklist:**
- [ ] Memory Leak check.
- [ ] Threading check.
- [ ] Security check.
**Pass Criteria:** Code represents the highest industry standard.
**Fail Criteria:** Code looks like a beginner's stack-overflow copy-paste.
**Common Mistakes:** Ignoring the lifecycle of flows in Compose (`collectAsStateWithLifecycle` must be used).
**AI Self Verification:** "Would a Staff Engineer approve this PR without comments?"

## 25. Enterprise Quality Gate
**Objective:** The absolute final barrier before code is considered complete.
**Enterprise Rules:**
- Code must not contain TODOs.
- Code must not contain placeholders like `// Add logic here`.
- Code must be fully implemented.
**Mandatory Checklist:**
- [ ] Scan for `TODO`.
- [ ] Scan for `FIXME`.
- [ ] Verify complete function bodies.
**Pass Criteria:** 100% complete, production-ready code.
**Fail Criteria:** Generation ends prematurely with instructions for the user to finish it.
**Common Mistakes:** Cutting code short due to output constraints.
**AI Self Verification:** "Have I provided the full implementation without leaving homework for the user?"

## 26. Duplicate Detection Rules
**Objective:** Prevent code bloat and maintain DRY (Don't Repeat Yourself) principles.
**Enterprise Rules:**
- Extract common UI patterns into a `core-ui` module.
- Extract common utility functions into `core-utils`.
**Mandatory Checklist:**
- [ ] Check if a similar Composable already exists.
- [ ] Check if base classes (BaseViewModel) can be utilized.
**Pass Criteria:** Highly modular, reusable codebase.
**Fail Criteria:** Three different screens implementing identical "Loading Dialogs".
**Common Mistakes:** Copy-pasting entire DTOs instead of using generic wrappers.
**AI Self Verification:** "Can any of this code be pushed down to a core module for reuse?"

## 27. Missing Code Detection Rules
**Objective:** Ensure complete slices of vertical features.
**Enterprise Rules:**
- Every feature MUST have: Entity, DTO, Model, DAO, RemoteDataSource, Repository, UseCase, ViewModel, Screen, Navigation Route.
**Mandatory Checklist:**
- [ ] Trace feature from UI -> DB.
- [ ] Identify any missing layer.
**Pass Criteria:** A complete vertical slice is generated.
**Fail Criteria:** Generating a UI without the corresponding UseCase.
**Common Mistakes:** Forgetting the Hilt Module binding for a new Repository.
**AI Self Verification:** "Have I traced the data flow from the Compose button click all the way to Firestore and back?"

## 28. CRUD Verification Rules
**Objective:** Ensure standard database operations are fully supported and robust.
**Enterprise Rules:**
- Create, Read, Update, Delete must all handle offline states.
- Must provide feedback via UI State on success/failure.
**Mandatory Checklist:**
- [ ] Verify Create handles ID generation (UUID) properly.
- [ ] Verify Read uses Flow.
- [ ] Verify Update performs partial updates (not overwriting with nulls).
- [ ] Verify Delete cleans up orphaned relations.
**Pass Criteria:** Full lifecycle of data is managed safely.
**Fail Criteria:** Delete operations leaving dangling references in Firestore.
**Common Mistakes:** Forgetting to update the local Room cache after a successful remote Update.
**AI Self Verification:** "Are all CRUD operations fully synced between Room and Firestore?"

## 29. Firestore Mapping Verification
**Objective:** Ensure exact 1:1 mapping between remote NoSQL data and local representations.
**Enterprise Rules:**
- Use `@DocumentId` for keys.
- Map Firestore Timestamps to `java.time.Instant` or `Long` locally.
**Mandatory Checklist:**
- [ ] Verify Timestamp conversion.
- [ ] Verify GeoPoint conversion (if applicable).
- [ ] Verify nested object mapping.
**Pass Criteria:** Data serialization to/from Firestore is seamless and crash-proof.
**Fail Criteria:** Crashing on unmapped field names.
**Common Mistakes:** Not providing default values in Firestore DTOs for missing remote fields.
**AI Self Verification:** "Is my DTO perfectly resilient to schema drift in Firestore?"

## 30. Room Sync Verification
**Objective:** Maintain perfect data harmony between local cache and remote server.
**Enterprise Rules:**
- Implement a `last_updated` timestamp for delta syncing.
- Use atomic transactions when bulk inserting from remote.
**Mandatory Checklist:**
- [ ] Verify `@Insert(onConflict = OnConflictStrategy.REPLACE)`.
- [ ] Ensure deleted remote items are removed from local Room DB.
**Pass Criteria:** The local database is an exact replica of authorized remote data.
**Fail Criteria:** Stale data remaining in Room indefinitely.
**Common Mistakes:** Appending data continuously without pruning deleted items.
**AI Self Verification:** "Does my sync logic account for remote deletions?"

## 31. Security Rules Verification
**Objective:** Validate that Firebase Security Rules match Domain logic.
**Enterprise Rules:**
- Users can only read/write their own data (`request.auth.uid == resource.data.userId`).
- Validate data schemas within the rules.
**Mandatory Checklist:**
- [ ] Verify `request.auth != null`.
- [ ] Verify field-level type checking in Firestore Rules.
**Pass Criteria:** Database is impregnable to malicious client manipulation.
**Fail Criteria:** `allow read, write: if true;`
**Common Mistakes:** Securing the UI but leaving the database open.
**AI Self Verification:** "Have I authored matching backend security rules for this feature?"

## 32. Build Verification
**Objective:** Ensure the generated code compiles cleanly.
**Enterprise Rules:**
- Code must adhere to Kotlin lint rules (ktlint).
- No deprecated APIs (unless absolutely necessary with `@Suppress`).
**Mandatory Checklist:**
- [ ] Verify dependency versions.
- [ ] Verify correct import paths.
**Pass Criteria:** Code is syntactically perfect.
**Fail Criteria:** Unresolved references.
**Common Mistakes:** Importing standard `State` instead of Compose `State`.
**AI Self Verification:** "Have I strictly checked import statements for accuracy?"

## 33. Release Verification
**Objective:** Ensure code is ready for ProGuard/R8 and production deployment.
**Enterprise Rules:**
- `@Keep` must be used on DTOs if reflection (Gson/Moshi) is used, though Kotlinx Serialization is preferred.
- Remove all debugging tools from the release variant.
**Mandatory Checklist:**
- [ ] Verify obfuscation rules for data models.
- [ ] Verify signing configs are externalized.
**Pass Criteria:** Release builds will not crash due to minification.
**Fail Criteria:** Reflection crashes in release mode.
**Common Mistakes:** Forgetting to add ProGuard rules for a new third-party library.
**AI Self Verification:** "Is this code completely safe for R8 minification?"

## 34. Completion Rules
**Objective:** Define what "done" means for AI tasks.
**Enterprise Rules:**
- A task is complete only when all layers, tests, and configurations are generated and verified.
**Mandatory Checklist:**
- [ ] Domain implemented?
- [ ] Data implemented?
- [ ] UI implemented?
- [ ] DI configured?
**Pass Criteria:** The feature is plug-and-play.
**Fail Criteria:** "Here is the UI, implement the ViewModel yourself."
**Common Mistakes:** Skipping DI bindings.
**AI Self Verification:** "Is there absolutely nothing left for the user to write for this feature to work?"

## 35. Continuation Rules
**Objective:** Handle large requests that exceed output token limits.
**Enterprise Rules:**
- If generation stops, the AI MUST provide an exact command for the user to prompt continuation, OR auto-continue if capable.
- State must be perfectly maintained across responses.
**Mandatory Checklist:**
- [ ] Track current file being generated.
- [ ] Resume seamlessly without repeating code.
**Pass Criteria:** Large features span multiple responses flawlessly.
**Fail Criteria:** Restarting the file from scratch on continuation.
**Common Mistakes:** Losing imports when continuing a file.
**AI Self Verification:** "If I run out of tokens, exactly where will I cut off to ensure safe resumption?"

## 36. Session Recovery Rules
**Objective:** Re-establish context if a session drops or resets.
**Enterprise Rules:**
- Always ask for the `ARCHITECTURE_MANIFEST.md` or this `MASTER_GOVERNOR.md` upon a hard reset.
**Mandatory Checklist:**
- [ ] Scan for project stack definition.
- [ ] Re-verify module constraints.
**Pass Criteria:** AI adapts instantly to pre-existing context.
**Fail Criteria:** AI defaults to generic web-dev behaviors.
**Common Mistakes:** Forgetting the Offline-First requirement upon session restart.
**AI Self Verification:** "Do I have all governance rules loaded in memory?"

## 37. Progress Tracking Rules
**Objective:** Provide transparent updates to the user.
**Enterprise Rules:**
- Emit clear "checkpoints" during long generations (e.g., "Domain Layer complete. Generating Data Layer...").
**Mandatory Checklist:**
- [ ] Log status updates in markdown blockquotes.
**Pass Criteria:** User knows exactly where the AI is in the generation pipeline.
**Fail Criteria:** Silent failure or mysterious halts.
**Common Mistakes:** Generating silently for 3 minutes and then failing on a timeout.
**AI Self Verification:** "Am I communicating my architectural progress clearly?"

## 38. Final Acceptance Rules
**Objective:** The ultimate sign-off.
**Enterprise Rules:**
- The AI must output a final summary of what was built, verifying it against the initial prompt and the MASTER_GOVERNOR.
**Mandatory Checklist:**
- [ ] Ensure all 38 chapters were respected.
- [ ] Confirm no placeholders exist.
**Pass Criteria:** Perfect execution.
**Fail Criteria:** Rushing the end of the response.
**Common Mistakes:** Missing the final validation step.
**AI Self Verification:** "Has the Final Governor Engine executed?"

---

## MASTER 300-POINT GOVERNANCE CHECKLIST
*AI MUST internally validate against these points for large modules.*

### Architecture & Domain (001-050)
1. Verify no Android imports in Domain.
2. Verify Domain Models use pure Kotlin data classes.
3. Verify UseCases implement a single `operator fun invoke`.
4. Verify UseCases are injected via Constructor.
5. Verify Repositories are defined as Interfaces in Domain.
6. Verify no external API constraints leak into Domain.
7. Verify Domain models have no `@Entity` annotations.
8. Verify Domain models have no `@DocumentId` annotations.
9. Verify all business rules are encapsulated in UseCases or Domain Models.
10. Verify Validation Result states are defined in Domain.
11. Verify Result/Either monad or Kotlin `Result` is used for UseCase returns.
12. Verify UseCases run on `Dispatchers.Default` if doing heavy computation.
13. Verify Repository Interfaces return `Flow` for streams.
14. Verify Repository Interfaces return `suspend` for one-shots.
15. Verify Custom Exceptions are defined in Domain layer.
16. Verify Domain layer depends on ZERO other modules except maybe `core-utils`.
17. Verify UseCases are tested with pure JUnit.
18. Verify mockability of all UseCases.
19. Verify UseCases do not hold state.
20. Verify UseCases do not contain UI logic.
... *(Points 21-50 enforce strict Clean Architecture boundaries, dependency inversion, and pure Kotlin compliance)*

### Data Layer: Firestore (051-100)
51. Verify batched writes are used for multi-document updates.
52. Verify Transactions are used when reads inform writes.
53. Verify `await()` is used properly on Tasks.
54. Verify `snapshotFlow` (callbackFlow) handles `awaitClose` to remove listeners.
55. Verify queries are indexed in Firebase.
56. Verify pagination (`limit`, `startAfter`) on large collections.
57. Verify Firestore DTOs have default values for all properties (Firebase requirement).
58. Verify no domain logic happens inside the RemoteDataSource.
59. Verify network availability is checked before forced fetches.
60. Verify offline persistence is enabled in Firebase configuration.
... *(Points 61-100 enforce Firestore limits, mapping rules, offline settings, and security rule matching)*

### Data Layer: Room DB (101-150)
101. Verify `@Entity` tables map correctly to domain requirements.
102. Verify Primary Keys are UUID strings or auto-generated Longs.
103. Verify `@TypeConverter` exists for complex properties (lists, dates).
104. Verify DAOs return `Flow<List<T>>` for reactive UI updates.
105. Verify `@Transaction` is on DAOs doing multiple table operations.
106. Verify Room database version is incremented on schema change.
107. Verify Migration classes are provided for schema changes.
108. Verify Foreign Keys define `onDelete = CASCADE` where appropriate.
109. Verify Indices are added for queried columns to prevent table scans.
110. Verify local mappings `toDomain()` and `toEntity()` exist and are correct.
... *(Points 111-150 enforce Room performance, threading, schema integrity, and Single Source of Truth)*

### Repository Implementation (151-200)
151. Verify RepositoryImpl implements Domain Repository Interface.
152. Verify RepositoryImpl injects Room DAO and Firestore DataSource.
153. Verify RepositoryImpl maps DTOs -> Entities -> Domain Models.
154. Verify NetworkBoundResource (or equivalent) coordinates fetch/save/read.
155. Verify remote errors do not crash the app if local data is available.
156. Verify `Dispatchers.IO` is the default execution context.
157. Verify empty local DB triggers remote fetch immediately.
158. Verify concurrent data access is handled safely.
159. Verify data caching rules are strictly followed.
160. Verify synchronization logic runs in WorkManager for offline mutations.
... *(Points 161-200 enforce Repository coordination, error mapping, and data flow synchronization)*

### Presentation Layer: ViewModel (201-250)
201. Verify `@HiltViewModel` annotation is present.
202. Verify ViewModel extends `ViewModel()`.
203. Verify `StateFlow` is exposed for UI State.
204. Verify `SharedFlow` or `Channel` is exposed for One-Time Events.
205. Verify `viewModelScope.launch` is used.
206. Verify no standard Android dependencies are injected.
207. Verify UI State is an exhaustive Data Class or Sealed Class.
208. Verify UseCases are injected, not Repositories.
209. Verify `update { }` is used on MutableStateFlow for concurrency.
210. Verify loading, success, and error states are handled.
... *(Points 211-250 enforce reactive UI state, strict encapsulation, memory safety, and lifecycle awareness)*

### Presentation Layer: Jetpack Compose (251-300)
251. Verify standard `@Composable` annotations.
252. Verify `Modifier` is always the first optional parameter with default `Modifier`.
253. Verify `collectAsStateWithLifecycle()` is used for ViewModel state.
254. Verify UI is hoisted: stateless composables take state in, pass events out.
255. Verify `MaterialTheme` typography and colors are used strictly.
256. Verify no hardcoded string literals (use `stringResource`).
257. Verify `@Preview` is provided for Light/Dark themes.
258. Verify `remember` is used to prevent redundant calculations.
259. Verify `LazyColumn` uses `key` for items.
260. Verify Navigation strictly uses type-safe routes.
... *(Points 261-300 enforce Compose skippability, performance best practices, accessibility (contentDescription), and modularity)*

---

## FINAL GOVERNOR ENGINE
**[SYSTEM DIRECTIVE]**
This engine MUST execute conceptually within the AI's internal reasoning BEFORE producing any file or code output.

```pseudocode
BEGIN GOVERNOR ENGINE

  LOAD MASTER_GOVERNOR.md
  
  SET STATUS = "VALIDATING_REQUEST"
  
  IF Request.Contains("TODO") OR Request.Contains("Placeholder"):
    REJECT_REQUEST("Enterprise rules forbid placeholders.")
    
  IF Request.TargetLayer == "UI":
    VERIFY_EXISTS("ViewModel")
    VERIFY_EXISTS("UseCase")
    VERIFY_EXISTS("Repository")
    IF MISSING:
      GENERATE_MISSING_LAYERS_FIRST()
      
  IF Request.HasDatabaseChanges:
    VERIFY_EXISTS("Room Entity")
    VERIFY_EXISTS("Firestore DTO")
    VERIFY_EXISTS("Migration Strategy")
    VERIFY_SYNC_LOGIC()
    
  WHILE Generating_Code:
    ENFORCE(CleanArchitecture.DependencyRule)
    ENFORCE(NamingConventions.All)
    ENFORCE(Hilt.Annotations)
    ENFORCE(Compose.PerformanceRules)
    
  IF Generated_Code.Contains("import android.*") IN "Domain Layer":
    PURGE_AND_REGENERATE("Domain layer tainted with Android dependencies.")
    
  IF Generated_Code.IsIncomplete():
    CONTINUE_GENERATING_UNTIL_DONE()

  GENERATE_AUDIT_REPORT()
  
END GOVERNOR ENGINE
```

### AI Acknowledgment Protocol
Before outputting any code, the AI must silently process the Final Governor Engine. All generated code that follows this document will be structurally sound, highly scalable, and completely free of placeholders.

**END OF DOCUMENT**
