# Đối chiếu bộ ghi chú Frontend với tài liệu chính thức

Audit chỉ-đọc ngày 2026-10-27, phạm vi: `Vue`, `React`, `FE-Common`. Mục tiêu: ghi chú rút gọn cho người đã làm Frontend, không thiếu phần cốt lõi. Phiên bản đối chiếu: React 19.x (react.dev hiển thị v19.3), Vue 3.5, TypeScript Handbook (có trang What's New tới 6.0).

**Tóm tắt:**

- Bộ ghi chú Frontend đủ cho phần lõi framework: khoảng 97% chủ đề MUST (69/71) được phủ từ mức 2 trở lên.
- Vue 3.5 phủ rất tốt (reactivity, `defineModel`, compiler, Pinia, Router, Nuxt); React 19 phủ tốt (`use()`, Actions, RSC, React Compiler).
- Khoảng trống thật sự nằm ở nền tảng web ngoài framework: CSS layout, DOM event delegation, observer API, real-time, OAuth/OIDC phía client.
- TypeScript mới mạnh ở type-level; còn thiếu overload, declaration file và type cho component.
- Hook React ít gặp (`useImperativeHandle`, `createPortal`) là hai mục đáng bổ sung nhất, các hook còn lại chỉ ở mức NICE.
- Thang độ phủ 0 đến 3 (không có, chỉ nhắc tên, giải thích cơ chế, có code hoặc sơ đồ) và mức quan trọng MUST, SHOULD, NICE, SKIP dùng xuyên suốt các bảng.
- Mục 3 xếp ưu tiên 15 khoảng trống G1 đến G15; nhóm MUST và SHOULD cần khoảng 4.900 từ, tương đương 1 bài mới và 9 mục bổ sung.

## 1. Kết luận

- Bộ ghi chú **đủ cho phần lõi** ở phần framework: khoảng 97% chủ đề MUST (69/71) được phủ mức 2 trở lên, phần lớn mức 3 (có code hoặc sơ đồ).
- Vue 3.5 phủ rất tốt: reactivity, props destructure, `useTemplateRef`, `onWatcherCleanup`, `defineModel`, compiler (patch flags, block tree), Suspense, KeepAlive, Teleport, Pinia, Router, Nuxt, testing.
- React 19 phủ tốt: ref là prop, `use()`, `useActionState`, `useFormStatus`, `useOptimistic`, RSC, Server Actions, React Compiler, Activity (một dòng).
- Thiếu thật sự (phủ <= 1, MUST hoặc SHOULD) tập trung ở **nền tảng web ngoài framework**: CSS layout và cascade, event delegation, observer API, real-time (WebSocket, SSE), OAuth/OIDC phía client, và **TypeScript ngoài type-level** (overload, declaration file, class).
- Hook React ít gặp chưa có: `useImperativeHandle`, `createPortal`, `useInsertionEffect`, `useDebugValue`, `cache`, `<ViewTransition>`. Chỉ `useImperativeHandle` và `createPortal` đáng bổ sung (SHOULD).
- Thang: 0 không có, 1 chỉ nhắc tên, 2 giải thích cơ chế, 3 có code hoặc sơ đồ. Quan trọng: MUST, SHOULD, NICE, SKIP.

## 2. Bảng chính

Viết tắt bài: V1 = [Vue 1](/go?p=10-Vue%2Feasy%2Flt-01-reactivity-vue3.md), V2 = [Vue 2](/go?p=10-Vue%2Feasy%2Flt-02-component-props-events-slots.md), V3 = [Vue 3](/go?p=10-Vue%2Feasy%2Flt-03-api-styles-lifecycle.md), V4 = [Vue 4](/go?p=10-Vue%2Fmedium%2Flt-04-computed-watch-rendering.md), V5 = [Vue 5](/go?p=10-Vue%2Fmedium%2Flt-05-composables-pinia.md), V6 = [Vue 6](/go?p=10-Vue%2Fmedium%2Flt-06-router-forms.md), V7 = [Vue 7](/go?p=10-Vue%2Fmedium%2Flt-07-testing-vue.md), V8 = [Vue 8](/go?p=10-Vue%2Fhard%2Flt-08-hieu-nang-rendering.md), V9 = [Vue 9](/go?p=10-Vue%2Fhard%2Flt-09-ssr-nuxt-hydration.md), V10 = [Vue 10](/go?p=10-Vue%2Fhard%2Flt-10-pattern-nang-cao-kien-truc.md), VQ = [Vue Q&A](/go?p=07-Interview-QA%2FFrontend%2Fhard%2Fqa-vue-phong-van.md).
R1 = [React 1](/go?p=09-React%2Feasy%2Flt-01-tu-duy-react-render.md), R2 = [React 2](/go?p=09-React%2Feasy%2Flt-02-hooks-co-ban.md), R3 = [React: Composition](/go?p=09-React%2Feasy%2Flt-25-composition.md), R4 = [React: Memo hóa](/go?p=09-React%2Fmedium%2Flt-32-memo-hoa.md), R5 = [React 5](/go?p=09-React%2Fmedium%2Flt-05-state-management.md), R6 = [React 6](/go?p=09-React%2Fmedium%2Flt-06-routing-forms-data.md), R7 = [React 7](/go?p=09-React%2Fmedium%2Flt-07-testing-react.md), R8 = [React 8](/go?p=09-React%2Fhard%2Flt-08-fiber-concurrent.md), R9 = [React 9](/go?p=09-React%2Fhard%2Flt-09-ssr-rsc-nextjs.md), R10 = [React 10](/go?p=09-React%2Fhard%2Flt-10-hieu-nang-kien-truc.md), RQ = [React Q&A](/go?p=07-Interview-QA%2FFrontend%2Fhard%2Fqa-react-phong-van.md).
F1 = [FE 1 runtime](/go?p=11-Frontend-Core%2Flt-01-javascript-runtime-event-loop.md), F2 = [FE 2 TypeScript](/go?p=11-Frontend-Core%2Flt-02-typescript-nang-cao.md), F3 = [FE 3 performance](/go?p=11-Frontend-Core%2Flt-03-web-performance-core-web-vitals.md), F4 = [FE 4 bảo mật](/go?p=11-Frontend-Core%2Flt-04-bao-mat-frontend.md), F5 = [FE 5 kiến trúc](/go?p=11-Frontend-Core%2Flt-05-kien-truc-frontend.md), FQ = [FE Q&A](/go?p=07-Interview-QA%2FFrontend%2Fhard%2Fqa-fe-phong-van.md).

### 2.1 Vue 3 (vuejs.org/guide, router.vuejs.org, pinia.vuejs.org, nuxt.com)

| Chủ đề (nguồn) | Mức | Phủ | Bài | Ghi chú |
|---|---|---|---|---|
| Reactivity Fundamentals: ref, reactive, mất reactivity khi destructure | MUST | 3 | V1 | Có sơ đồ track/trigger |
| Reactivity in Depth: Proxy, shallowRef, markRaw, triggerRef, 3.5 version counting | MUST | 3 | V1, V8 | `customRef` chưa có (NICE) |
| Computed | MUST | 3 | V4 | |
| Watchers: watch, watchEffect, flush, cleanup | MUST | 3 | V4, V3 | `onWatcherCleanup` 3.5 có |
| Template Refs, `useTemplateRef` 3.5 | SHOULD | 3 | V1, V3 | |
| Lifecycle Hooks, thứ tự cha-con | MUST | 3 | V3 | |
| Template syntax, v-if, v-for, key, v-memo, v-once | MUST | 3 | V4 | |
| Form Input Bindings, v-model native | SHOULD | 2 | V6 | |
| Component Registration (global, local) | SKIP | 0 | | Cơ bản, không cần |
| Props: một chiều, validation, 3.5 destructure | MUST | 3 | V2 | |
| Events, emits | MUST | 3 | V2 | |
| Component v-model, `defineModel` | MUST | 3 | V2 | |
| Fallthrough Attributes, `$attrs`, `inheritAttrs` | MUST | 3 | V2 | |
| Slots, scoped slots, `defineSlots` | MUST | 3 | V2, V10 | |
| Provide / inject | MUST | 3 | V2 | `InjectionKey` có trong V10 |
| Async Components, `defineAsyncComponent` | MUST | 3 | V8 | |
| Composables | MUST | 3 | V3, V5 | |
| Custom Directives | SHOULD | 3 | V10 | |
| Plugins | SHOULD | 3 | V10 | |
| Transition, TransitionGroup | SHOULD | 3 | V10 | `mode`, FLIP |
| KeepAlive, `onActivated` | SHOULD | 3 | V8, V3 | |
| Teleport | SHOULD | 3 | V8 | |
| Suspense (async setup, fallback, timeout) | SHOULD | 3 | V8 | Ghi rõ là experimental |
| Single-File Components, `<script setup>`, scoped style | MUST | 3 | V3, V2 | `v-bind()` trong CSS chưa có (NICE) |
| Tooling (Vite, create-vue, ESLint) | SHOULD | 2 | [Vue index](/go?p=10-Vue%2Findex.md), V3 | Chỉ nhắc ngắn |
| Routing (Vue Router: guard, meta, lazy, history mode) | MUST | 3 | V6 | Typed routes, data loaders chưa có (NICE) |
| State Management, Pinia (setup/option store, storeToRefs, plugin, SSR) | MUST | 3 | V5 | |
| Testing (Vitest, VTU, Testing Library, MSW, E2E) | MUST | 3 | V7 | |
| SSR, hydration mismatch, Nuxt (useFetch, useAsyncData, routeRules, islands) | MUST | 3 | V9 | |
| Best Practices: Performance | MUST | 3 | V8 | |
| Best Practices: Production Deployment | SHOULD | 1 | V8 (đo, bundle) | Không có mục riêng: build flags, source map, error tracking |
| Best Practices: Accessibility (Vue) | SHOULD | 2 | F5 | Phủ ở mức chung, không riêng Vue (focus, `useId` 3.5) |
| Best Practices: Security (v-html, URL, template injection) | SHOULD | 2 | V10, F4 | Có dòng `v-html`; thiếu mục riêng cho `:href` và template từ user |
| TypeScript Overview, with Composition API (typed props, emits, ref, generic component) | MUST | 2 | V2, V10, F2 | Rải rác, chưa có một bài gom |
| TypeScript with Options API | SKIP | 0 | | |
| Extras: Rendering Mechanism (compiler, vDOM, patch flags, block tree) | MUST | 3 | V4 | |
| Extras: Render Functions and JSX (`h()`, functional component) | SHOULD | 3 | V10 | JSX trong Vue chỉ nhắc |
| Extras: Vue and Web Components (`defineCustomElement`) | NICE | 0 | | Xem khoảng trống G9 |
| Extras: Animation Techniques (class, state-driven) | NICE | 1 | V10 | |
| Extras: Composition API FAQ, Options vs Composition | SHOULD | 2 | V3 | |
| Vue 3.6 Vapor Mode (theo roadmap) | NICE | 0 | | Từ kiến thức, chưa đối chiếu nguồn |
| i18n (vue-i18n) | NICE | 1 | F5 | |
| Nuxt: modules, Nitro server routes, layers | SHOULD | 2 | V9 | |

### 2.2 React 19 (react.dev/learn, /reference)

| Chủ đề (nguồn) | Mức | Phủ | Bài | Ghi chú |
|---|---|---|---|---|
| Quick Start, Thinking in React, composition | MUST | 3 | R1, R3 | |
| Render and Commit, trigger, ba phase | MUST | 3 | R1 | |
| Keeping Components Pure, StrictMode | MUST | 3 | R1 | |
| Rendering Lists, key, reconciliation | MUST | 3 | R1 | |
| State as a Snapshot, Queueing updates, batching | MUST | 3 | R1 | |
| Updating Objects and Arrays in State (immutable) | MUST | 3 | R1 | |
| useState | MUST | 3 | R2 | |
| useEffect, Synchronizing with Effects, lifecycle of Effects | MUST | 3 | R2 | Stale closure có sơ đồ |
| You Might Not Need an Effect | MUST | 3 | R2 | |
| Separating Events from Effects, `useEffectEvent` (19.2) | SHOULD | 2 | R2, R8 | |
| useRef, Manipulating the DOM with Refs, callback ref cleanup | MUST | 3 | R2 | |
| ref là prop (19), `forwardRef` | SHOULD | 3 | R2 | |
| useImperativeHandle | SHOULD | 0 | | Khoảng trống G6 |
| createContext, useContext, tối ưu re-render | MUST | 3 | R3, R5 | |
| useReducer, Scaling Up with Reducer and Context | MUST | 3 | R4, R5 | |
| useMemo, useCallback, memo | MUST | 3 | R4 | Đủ cả "khi nào không nên" |
| useLayoutEffect | SHOULD | 2 | R4 | |
| useId | SHOULD | 2 | R4 | Hydration mismatch ở R9 |
| useInsertionEffect | NICE | 0 | | Chỉ cho tác giả CSS-in-JS |
| useDebugValue | NICE | 0 | | |
| Custom Hooks, Reusing Logic | MUST | 3 | R4, R3 | |
| Rules of Hooks, eslint exhaustive-deps | MUST | 2 | R2, R4 | Các lint mới (`set-state-in-effect`, `purity`, `refs`) chưa có |
| useTransition, startTransition | MUST | 3 | R8 | |
| useDeferredValue | MUST | 3 | R8 | |
| useSyncExternalStore, tearing | SHOULD | 3 | R8 | |
| Suspense, `lazy` | MUST | 3 | R8, R10 | |
| `use` API (promise, context) | MUST | 3 | R8, R6 | |
| Activity (19.2) | NICE | 1 | R8 | Một dòng |
| `<ViewTransition>`, `addTransitionType` | NICE | 0 | | |
| `<Profiler>` | SHOULD | 3 | R10 | |
| `<Fragment>` | SKIP | 0 | | Có trong Quick Start, hiển nhiên |
| `cache`, `cacheSignal` | SHOULD | 0 | | Dùng với RSC (G8) |
| `act` (testing) | SHOULD | 2 | R7 | |
| Error Boundary (class, `react-error-boundary`), onCaughtError | MUST | 3 | R6, R10 | |
| `createPortal` | SHOULD | 0 | | Khoảng trống G6 (dialog, tooltip) |
| `flushSync` | NICE | 2 | R8 | |
| Forms: `<form action>`, `useActionState`, `useFormStatus`, `useOptimistic` | MUST | 3 | R6, R9 | `useOptimistic` mới 1 đoạn, chưa có ví dụ code riêng |
| Controlled và uncontrolled | MUST | 3 | R3, R6 | |
| react-dom client: `createRoot`, `hydrateRoot` | MUST | 2 | R8, R9 | |
| react-dom server: `renderToPipeableStream`, `renderToReadableStream` | SHOULD | 2 | R9 | |
| react-dom static: `prerender`, `resume` (PPR) | NICE | 1 | R9 | |
| Resource APIs: `preload`, `preconnect`, `preinit`; `<title>`, `<meta>` hoist | NICE | 1 | F3, R9 | Chỉ ở dạng HTML hint, chưa nêu API React |
| Server Components, `"use client"`, ranh giới | MUST | 3 | R9 | |
| Server Functions, `"use server"`, bảo mật | MUST | 3 | R9 | |
| `taintObjectReference` (experimental) | SKIP | 0 | | |
| React Compiler (config, `"use memo"`, `"use no memo"`) | SHOULD | 2 | R10, R4 | Directive và `compilationMode` chưa có |
| Rules of React (pure, React calls components) | MUST | 3 | R1 | |
| React DevTools, Performance tracks | SHOULD | 2 | R10 | |
| Legacy: class component, `Children`, `cloneElement`, `PureComponent` | SKIP | 2 | R3, R6 | Có đủ ở mức cần biết |
| Using TypeScript with React (props, hooks, event types) | MUST | 2 | F2, R4 | Chưa có mục "type cho component và hook" gom một chỗ |
| State management (Redux Toolkit, Zustand, TanStack Query) | MUST | 3 | R5 | |
| Routing (React Router data APIs, TanStack Router) | MUST | 3 | R6 | |
| Testing (RTL, Vitest, MSW, Playwright) | MUST | 3 | R7 | |
| Next.js App Router, caching, Cache Components | MUST | 3 | R9 | Ngoài react.dev nhưng thực tế phỏng vấn hỏi |
| Fiber, scheduler, lanes | SHOULD | 3 | R8 | |

### 2.3 TypeScript Handbook

| Chủ đề (nguồn) | Mức | Phủ | Bài | Ghi chú |
|---|---|---|---|---|
| Everyday Types, `unknown` vs `any`, `as const` | MUST | 3 | F2 | |
| Narrowing, type predicate, discriminated union, `never` | MUST | 3 | F2 | |
| More on Functions: generics ràng buộc, callback type | MUST | 3 | F2 | |
| More on Functions: **overload signatures**, `this` parameter | SHOULD | 0 | | Khoảng trống G7 |
| Object Types: interface vs type, readonly, index signature | MUST | 2 | F2 | |
| Generics, `keyof`, `typeof`, indexed access | MUST | 3 | F2 | |
| Conditional, mapped, template literal types, `infer` | MUST | 3 | F2 | |
| Utility Types (Partial, Pick, Omit, Record, ReturnType, Awaited, NoInfer) | MUST | 3 | F2 | |
| `satisfies` | SHOULD | 3 | F2 | |
| Classes: `implements`, `abstract`, access modifier | NICE | 0 | | Ít dùng ở FE hiện đại |
| Modules: `import type`, `verbatimModuleSyntax`, `moduleResolution` | SHOULD | 2 | F2, F1 | |
| Declaration files (`.d.ts`, `declare module`, augmentation) | SHOULD | 0 | | Khoảng trống G7 (ví dụ `ImportMeta`, `ComponentCustomProperties`) |
| tsconfig strictness: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` | MUST | 3 | F2 | |
| Variance, `in`/`out` | NICE | 0 | | |
| Project references | NICE | 0 | | Liên quan monorepo, xem F5 |
| Enums vs union literal | SHOULD | 2 | F2 | |
| Branded types | NICE | 2 | F2 | |
| Decorators, Namespaces, Mixins | SKIP | 0 | | |

### 2.4 Web platform (web.dev, MDN)

| Chủ đề (nguồn) | Mức | Phủ | Bài | Ghi chú |
|---|---|---|---|---|
| Event loop, microtask, macrotask, rAF (MDN Event loop) | MUST | 3 | F1 | |
| Closure, `this`, prototype | MUST | 3 | F1 | |
| Promise, async/await, các bẫy | MUST | 3 | F1 | |
| ESM và CommonJS | MUST | 2 | F1 | |
| Memory leak, WeakMap | MUST | 3 | F1 | |
| Web Worker | SHOULD | 3 | F1 | |
| Service Worker, PWA, precaching | SHOULD | 1 | F1 (một dòng) | Khoảng trống G5 |
| fetch, AbortController, race condition | MUST | 3 | F1, R6 | |
| Web Storage, cookie, IndexedDB | SHOULD | 2 | F4 | IndexedDB chỉ nhắc |
| DOM events: bubbling, capturing, **event delegation**, `stopPropagation` | MUST | 0 | | Khoảng trống G1 |
| IntersectionObserver, ResizeObserver, MutationObserver | SHOULD | 1 | F1 (nhắc), V5 (VueUse) | Khoảng trống G4 |
| CSS nền tảng: cascade, specificity, box model, flex, grid, stacking context, container query | MUST | 0 | | Khoảng trống G2 |
| Core Web Vitals: LCP, INP, CLS, ngưỡng, đo | MUST | 3 | F3 | |
| Critical rendering path, parser/render blocking | MUST | 3 | F3 | |
| Resource hints, preload, fetchpriority | MUST | 3 | F3 | |
| Image, font, video performance | SHOULD | 2 | F3 | Video chưa có |
| Code splitting, tree shaking, bundle analysis | MUST | 3 | F3, R10, V8 | |
| HTTP cache, CDN, stale-while-revalidate, bfcache | MUST | 3 | F3 | |
| Prefetch, prerender (Speculation Rules) | NICE | 2 | F3 | |
| Lighthouse, CrUX, RUM, performance budget | SHOULD | 3 | F3 | |
| Accessibility: semantic HTML, keyboard, focus, ARIA, WCAG, `aria-live` | MUST | 2 | F5 | Chỉ một bảng, không code ví dụ (dialog, tab, combobox) |
| XSS, sanitize, Trusted Types | MUST | 3 | F4 | |
| CSP | MUST | 3 | F4 | |
| CORS, preflight | MUST | 3 | F4 | |
| CSRF, SameSite | MUST | 3 | F4 | |
| Lưu token: cookie HttpOnly vs localStorage | MUST | 3 | F4 | |
| OAuth 2.0 / OIDC, PKCE phía SPA, BFF | SHOULD | 1 | F4 (BFF 1 dòng) | Khoảng trống G3 |
| Clickjacking, SRI, supply chain npm | SHOULD | 3 | F4 | |
| WebSocket, SSE, polling | SHOULD | 0 | | Khoảng trống G3b |
| Phân trang, infinite scroll, cursor | SHOULD | 1 | R10 (virtualization) | Khoảng trống G4 |
| Web Components, Shadow DOM, Custom Elements | NICE | 0 | F5 (một chỗ nhắc) | Khoảng trống G9 |
| Micro-frontend, Module Federation | SHOULD | 3 | F5 | |
| Monorepo, design system, feature flag, i18n, CI, Sentry | SHOULD | 3 | F5 | |

## 3. Khoảng trống cần bổ sung (xếp ưu tiên)

Chỉ liệt kê mục có độ phủ <= 1 và mức MUST hoặc SHOULD (kèm vài mục NICE rẻ chi phí ở cuối). Số từ là ước lượng cho phần thêm vào, giữ phong cách rút gọn.

| Mã | Mức | Khoảng trống | Đề xuất cụ thể | Số từ |
|---|---|---|---|---|
| G1 | MUST | DOM events: bubbling, capturing, event delegation, `passive`, `once`, `composedPath`; cách React 17+ gắn event ở root, Vue `.stop`, `.capture` | Thêm mục "DOM event" vào [FE 1](/go?p=11-Frontend-Core%2Flt-01-javascript-runtime-event-loop.md), trước phần Web Worker | 350 |
| G2 | MUST | CSS nền tảng cần nắm: cascade và specificity, box model, flex vs grid, stacking context và `z-index`, `position: sticky`, container query, CSS variables, `:has()`, logical properties, chiến lược CSS (module, utility, CSS-in-JS runtime vs zero-runtime) | Tạo bài mới `11-Frontend-Core/lt-06-css-layout-va-chien-luoc-style.md` (nối vào [FE index](/go?p=11-Frontend-Core%2Findex.md) và sidebar) | 900 |
| G3 | SHOULD | Authentication phía SPA: OAuth 2.0 Authorization Code + PKCE, OIDC, silent refresh, refresh token rotation, BFF | Thêm mục vào [FE 4](/go?p=11-Frontend-Core%2Flt-04-bao-mat-frontend.md) sau phần "Lưu token" | 400 |
| G3b | SHOULD | Real-time: polling, long polling, SSE, WebSocket, reconnect với backoff, đồng bộ cache TanStack Query/Pinia | Thêm mục "Giao tiếp real-time" vào [FE 5](/go?p=11-Frontend-Core%2Flt-05-kien-truc-frontend.md) | 350 |
| G4 | SHOULD | Observer API (IntersectionObserver cho lazy load, infinite scroll, sticky sentinel; ResizeObserver), phân trang offset vs cursor, infinite scroll kèm a11y | Thêm mục vào [FE 3](/go?p=11-Frontend-Core%2Flt-03-web-performance-core-web-vitals.md) (lazy load) và nối từ [React 10](/go?p=09-React%2Fhard%2Flt-10-hieu-nang-kien-truc.md) phần Virtualization | 400 |
| G5 | SHOULD | Service Worker và PWA: lifecycle, chiến lược cache (cache-first, stale-while-revalidate), cập nhật phiên bản, Workbox, push | Thêm mục vào [FE 1](/go?p=11-Frontend-Core%2Flt-01-javascript-runtime-event-loop.md) cạnh Web Worker, hoặc [FE 3](/go?p=11-Frontend-Core%2Flt-03-web-performance-core-web-vitals.md) phần Cache | 400 |
| G6 | DONE | React: `createPortal`, `useImperativeHandle` (kèm `ref` là prop 19), pattern dialog và focus return | Đã có: `createPortal` ở [React: Styling & Headless UI](/go?p=09-React%2Fhard%2Flt-16-styling-headless-ui-react.md), `useImperativeHandle`/ref nâng cao ở [React: Imperative Handle](/go?p=09-React%2Fhard%2Flt-13-imperative-handle-ref-nang-cao.md) | 350 |
| G7 | SHOULD | TypeScript: function overload, `this` parameter, declaration file (`.d.ts`, `declare module`, module augmentation cho `ImportMeta.env`, Vue `ComponentCustomProperties`), `import type` | Thêm hai mục vào [FE 2](/go?p=11-Frontend-Core%2Flt-02-typescript-nang-cao.md) trước "Bẫy thường gặp" | 450 |
| G8 | SHOULD | React `cache()` (de-dup trong một request RSC), `useOptimistic` có ví dụ code đầy đủ kèm rollback | Mở rộng [React 9](/go?p=09-React%2Fhard%2Flt-09-ssr-rsc-nextjs.md) (cache) và [React 6](/go?p=09-React%2Fmedium%2Flt-06-routing-forms-data.md) (useOptimistic) | 300 |
| G9 | SHOULD | Vue: Production Deployment (cờ `__VUE_PROD_DEVTOOLS__`, `__VUE_OPTIONS_API__`, source map, error tracking), Security mục riêng (URL `:href` do user, template từ user, `v-html`), a11y riêng cho Vue | Thêm mục "Deploy production, bảo mật, a11y" vào [Vue 8](/go?p=10-Vue%2Fhard%2Flt-08-hieu-nang-rendering.md) hoặc [Vue 10](/go?p=10-Vue%2Fhard%2Flt-10-pattern-nang-cao-kien-truc.md) | 400 |
| G10 | SHOULD | Accessibility có code: dialog (focus trap, `inert`), tab, combobox, `aria-live`, `prefers-reduced-motion`; kiểm thử bằng axe | Mở rộng mục Accessibility ở [FE 5](/go?p=11-Frontend-Core%2Flt-05-kien-truc-frontend.md) | 350 |
| G11 | DONE | TypeScript cho component: type props, event, `ComponentProps`, generic component, `forwardRef`/ref là prop (React) và `defineProps<T>()`, `defineEmits` (Vue) trong một chỗ | Đã có: [React: TypeScript nâng cao cho component](/go?p=09-React%2Fhard%2Flt-12-typescript-nang-cao-cho-react.md); Vue xem [Vue 2](/go?p=10-Vue%2Feasy%2Flt-02-component-props-events-slots.md) | 400 |
| G12 | SHOULD | React Compiler: `compilationMode`, `"use memo"`, `"use no memo"`, lint mới của `eslint-plugin-react-hooks` (`purity`, `refs`, `set-state-in-effect`, `immutability`) | Mở rộng mục React Compiler ở [React 10](/go?p=09-React%2Fhard%2Flt-10-hieu-nang-kien-truc.md) | 250 |
| G13 | NICE | Web Components (Custom Elements, Shadow DOM, slot, `defineCustomElement` của Vue, React 19 hỗ trợ custom element) | Thêm mục cuối [FE 5](/go?p=11-Frontend-Core%2Flt-05-kien-truc-frontend.md) hoặc [Vue 10](/go?p=10-Vue%2Fhard%2Flt-10-pattern-nang-cao-kien-truc.md) | 300 |
| G14 | NICE | Vue: `customRef`, `v-bind()` trong CSS, Vapor Mode (theo roadmap, cần kiểm tra nguồn trước khi viết) | Thêm bảng ngắn vào [Vue 1](/go?p=10-Vue%2Feasy%2Flt-01-reactivity-vue3.md) | 150 |
| G15 | NICE | React: `<ViewTransition>`, `useInsertionEffect`, `useDebugValue`, resource APIs (`preload`, `preinit`) | Thêm bảng "API ít gặp" vào [React 10](/go?p=09-React%2Fhard%2Flt-10-hieu-nang-kien-truc.md) | 200 |

Tổng cho nhóm MUST và SHOULD (G1 tới G12): khoảng 4.900 từ, tương đương 1 bài mới và 9 mục bổ sung.

Các hạng mục cố ý bỏ qua (SKIP): đăng ký component, Options API chi tiết, class component và `PureComponent`, decorator, namespace, mixin TypeScript, `taintObjectReference`. Hợp lý với mục tiêu rút gọn.

## 4. Nguồn đã tra

Lấy được và dùng để rút mục lục:

- https://vuejs.org/guide/introduction.html (sidebar đầy đủ: Essentials, Components In-Depth, Reusability, Built-in Components, Scaling Up, Best Practices, TypeScript, Extra Topics)
- https://react.dev/reference/react (mục lục reference v19.3: hooks, components, APIs, react-dom, Compiler, ESLint, Rules of React, RSC, Legacy)
- https://react.dev/learn (mục lục Learn: Quick Start, Describing the UI, Adding Interactivity, Managing State, Escape Hatches, React Compiler)
- https://www.typescriptlang.org/docs/handbook/intro.html (sidebar Handbook, Reference, Modules, Declaration Files, Project Configuration)
- https://web.dev/learn/performance (mục lục khóa Learn Performance)
- https://web.dev/articles/vitals (Core Web Vitals: LCP, INP, CLS, ngưỡng, công cụ)
- https://router.vuejs.org/guide/ (sidebar Vue Router v4/v5: Essentials, Advanced, File-Based Routing, Data Loaders)
- https://pinia.vuejs.org/core-concepts/ (sidebar Pinia v3: State, Getters, Actions, Plugins, SSR, Cookbook)
- https://nuxt.com/docs/getting-started/introduction (tính năng chính của Nuxt)
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop (tải được nhưng chỉ dùng để xác nhận chủ đề, không đọc từng dòng)

Không đối chiếu từ nguồn (ghi "từ kiến thức, chưa đối chiếu nguồn"):

- MDN: Web Storage, Service Worker, IntersectionObserver, ARIA, CORS, CSP (chưa tải trang riêng; chủ đề rút từ kiến thức)
- Vue: các trang con (Best Practices, Extra Topics) chỉ lấy tên mục từ sidebar, không đọc nội dung
- Vue 3.6 Vapor Mode (theo kiến thức, cần kiểm tra trước khi viết)
- Nội dung chi tiết các trang con của React Compiler và ESLint plugin (chỉ lấy tên mục)

Phương pháp chấm độ phủ: grep từ khóa tiếng Anh và tiếng Việt trên 37 file markdown trong `Vue`, `React`, `FE-Common`, sau đó đọc tiêu đề mục và các đoạn liên quan để phân biệt mức 1, 2, 3. Con số "97% MUST" là ước lượng thủ công (69 trên 71 hạng mục MUST ở mức 2 trở lên), không phải đo tự động.

