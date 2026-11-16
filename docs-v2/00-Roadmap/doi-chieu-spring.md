# Đối chiếu độ phủ với tài liệu chính thức Spring

Phạm vi: `Spring Boot/`, kèm `Kafka/`, `Redis/`, `Database/`, `Interview-QA/`. Audit chỉ đọc, ngày 2026-10-27. Thang độ phủ: 0 = không có, 1 = chỉ nhắc tên, 2 = có giải thích cơ chế, 3 = có ví dụ code hoặc sơ đồ.

**Tóm tắt:**

- Phần lõi (IoC, AOP, transaction, JPA, Security, Kafka, resilience, observability, Docker/K8s) đạt mức 3; MUST phủ >= 2 khoảng 99% (70/71), SHOULD chỉ khoảng 31%.
- Thiếu tập trung ở 5 nhóm: cross-cutting của MVC/Core (SpEL, ConversionService, validation nâng cao), Spring Data JPA nâng cao, HTTP client, vận hành Boot, và Boot 4 / Framework 7.
- `concept-map.md` đã lỗi thời so với các bài mới (ProblemDetail, Flyway, idempotency, outbox, Gateway, JWT).
- Cache abstraction, Specification, JdbcTemplate chỉ nằm trong `Interview-QA/` hoặc `Redis/`, người học theo lộ trình Spring Boot dễ bỏ sót.
- Spring Cloud chỉ ở mức khái niệm cộng YAML ngắn, chấp nhận được nếu định hướng là Kubernetes-native.
- Bộ ghi chú bám Boot 3.x trong khi tài liệu chính thức đã là Boot 4.1 / Framework 7 / Security 7.
- Mục 3 liệt kê 19 khoảng trống theo ưu tiên và đã được bù bằng các bài lt-36 đến lt-39 cùng các mục bổ sung.

## 1. Kết luận

- Nhìn chung **đủ ở mức thực hành vững cho phần lõi** (IoC, AOP, transaction, JPA, Security, Kafka, resilience, observability, Docker/K8s đều đạt mức 3). Có 149 chủ đề được chấm.
- Chủ đề MUST: 71; phủ mức >= 2: 70 (**khoảng 99%**), trong đó mức 3: 53. Lưu ý: mức 2 còn nhiều mục nông (Build systems, Logging, JSON, RestClient, Metrics/tracing). Chủ đề SHOULD phủ >= 2: 17/55 (khoảng 31%).
- Thiếu thật sự (MUST/SHOULD, phủ <= 1) tập trung ở 5 nhóm: (a) nhóm cross-cutting của Spring MVC/Core như SpEL, ConversionService, validation nâng cao, scope request/session; (b) Spring Data JPA nâng cao: Specification, Auditing, custom repository, mapping nâng cao; (c) gọi HTTP đi: HTTP Service interface, bài riêng về RestClient; (d) vận hành Boot: Docker Compose support, SSL bundle, actuator endpoint phụ, GraalVM/AOT thực hành; (e) thay đổi Boot 4 / Framework 7 (hiện chỉ bám Boot 3).
- `01-Spring-Boot/concept-map.md` đã **lỗi thời**: nhiều dòng ghi "Chưa" nay đã có bài (ProblemDetail, Flyway, idempotency, outbox, Gateway, Micrometer, JWT, test bảo mật). Nên cập nhật khi bổ sung.
- Một số nội dung chỉ nằm trong `Interview-QA/` hoặc `Redis/` (Cache abstraction, Specification, JdbcTemplate); người học theo lộ trình Spring Boot sẽ bỏ sót.
- Phần Spring Cloud chỉ ở mức khái niệm + YAML ngắn (Gateway, Config, Discovery, Feign mức 1 đến 2); chấp nhận được nếu mục tiêu là Kubernetes-native, cần ghi rõ định hướng.
- Độ chính xác: danh mục chủ đề lấy từ mục lục chính thức (xem mục 4); độ phủ chấm bằng grep + đọc đoạn liên quan, có thể sót nội dung diễn đạt bằng từ khóa khác.

## 2. Bảng đối chiếu

### A. Spring Framework: Core

| Chủ đề | Mức quan trọng | Độ phủ | Bài liên quan | Ghi chú |
|---|---|---|---|---|
| IoC container, BeanFactory/ApplicationContext | MUST | 3 | [IoC và DI](/go?p=01-Spring-Boot%2Feasy%2Flt-02-ioc-di.md), [Khởi động ApplicationContext](/go?p=01-Spring-Boot%2Fhard%2Flt-30-spring-khoi-dong-application-context.md) |  |
| DI: constructor, @Qualifier/@Primary, inject collection/Optional | MUST | 3 | [IoC và DI](/go?p=01-Spring-Boot%2Feasy%2Flt-02-ioc-di.md), [QA Spring cơ bản](/go?p=07-Interview-QA%2FBackend%2Feasy%2Fqa-02-spring-co-ban.md) |  |
| Bean scope singleton/prototype, pitfall prototype trong singleton | MUST | 3 | [IoC và DI](/go?p=01-Spring-Boot%2Feasy%2Flt-02-ioc-di.md) |  |
| Scope request/session/application, scoped proxy | SHOULD | 0 | - | Không có @RequestScope/@SessionScope/ObjectProvider |
| Bean lifecycle, init/destroy, SmartLifecycle | MUST | 3 | [Bean lifecycle](/go?p=01-Spring-Boot%2Feasy%2Flt-10-bean-lifecycle.md), [Khởi động ApplicationContext](/go?p=01-Spring-Boot%2Fhard%2Flt-30-spring-khoi-dong-application-context.md) |  |
| BeanPostProcessor, BeanFactoryPostProcessor | MUST | 3 | [Khởi động ApplicationContext](/go?p=01-Spring-Boot%2Fhard%2Flt-30-spring-khoi-dong-application-context.md), [Bean lifecycle](/go?p=01-Spring-Boot%2Feasy%2Flt-10-bean-lifecycle.md) |  |
| Circular dependency, cache 3 tầng | MUST | 3 | [Khởi động ApplicationContext](/go?p=01-Spring-Boot%2Fhard%2Flt-30-spring-khoi-dong-application-context.md) |  |
| @Configuration/@Bean, proxyBeanMethods, @Import, ImportSelector | SHOULD | 2 | [IoC và DI](/go?p=01-Spring-Boot%2Feasy%2Flt-02-ioc-di.md), [Khởi động ApplicationContext](/go?p=01-Spring-Boot%2Fhard%2Flt-30-spring-khoi-dong-application-context.md), [Auto-configuration](/go?p=01-Spring-Boot%2Fmedium%2Flt-14-autoconfiguration.md) | @Import/ImportSelector chỉ 1 dòng |
| @Lazy, @DependsOn, @Order | SHOULD | 1 | [IoC và DI](/go?p=01-Spring-Boot%2Feasy%2Flt-02-ioc-di.md), [AOP và Proxy](/go?p=01-Spring-Boot%2Fmedium%2Flt-13-aop-proxy.md) | @DependsOn chưa có |
| FactoryBean, BeanDefinitionRegistryPostProcessor | NICE | 1 | [QA Java hỏi xoáy](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-23-java-hoi-xoay-tu-sach.md) | Chỉ nhắc tên |
| Environment, PropertySource, @Value, thứ tự ưu tiên | MUST | 3 | [Cấu hình và Profile](/go?p=01-Spring-Boot%2Feasy%2Flt-11-config-profile.md), [Giới thiệu Boot](/go?p=01-Spring-Boot%2Feasy%2Flt-01-gioi-thieu-spring-boot.md) |  |
| Resource/ResourceLoader | NICE | 0 | - |  |
| Bean Validation: @Valid/@Validated, nested, @Validated trên properties | MUST | 2 | [REST Controller](/go?p=01-Spring-Boot%2Feasy%2Flt-03-rest-controller.md), [REST API thực chiến](/go?p=01-Spring-Boot%2Fmedium%2Flt-33-rest-api-thuc-chien.md), [Cấu hình và Profile](/go?p=01-Spring-Boot%2Feasy%2Flt-11-config-profile.md) |  |
| Validation nâng cao: nhóm (groups), ConstraintValidator tùy biến, method validation | SHOULD | 0 | - | Concept map ghi Chưa, grep không thấy ConstraintValidator |
| Data binding, @InitBinder, PropertyEditor | SHOULD | 1 | [MVC bên trong](/go?p=01-Spring-Boot%2Fmedium%2Flt-15-mvc-internals.md) | Chỉ 2 dòng |
| Type conversion: ConversionService, Converter, Formatter | SHOULD | 0 | - | Không có |
| SpEL (@Value, @Cacheable key, @PreAuthorize, condition) | SHOULD | 1 | [Application Event](/go?p=01-Spring-Boot%2Fmedium%2Flt-17-application-events.md), [Concept map](/go?p=01-Spring-Boot%2Fconcept-map.md) | Chỉ xuất hiện trong ví dụ, không có bài giải thích |
| AOP: JDK/CGLIB, advice, pointcut, thứ tự, self-invocation | MUST | 3 | [AOP và Proxy](/go?p=01-Spring-Boot%2Fmedium%2Flt-13-aop-proxy.md) |  |
| AspectJ weaving (LTW/compile-time) | NICE | 0 | - |  |
| AOT processing, RuntimeHints | SHOULD | 1 | [Khởi động ApplicationContext](/go?p=01-Spring-Boot%2Fhard%2Flt-30-spring-khoi-dong-application-context.md), [Docker và Kubernetes](/go?p=01-Spring-Boot%2Fhard%2Flt-29-docker-kubernetes.md) | Chỉ 1-2 dòng; RuntimeHints = 0 |
| Null-safety (@Nullable, JSpecify) | NICE | 0 | - |  |
| i18n MessageSource | NICE | 0 | - |  |
| Application events, @EventListener, @TransactionalEventListener | MUST | 3 | [Application Event](/go?p=01-Spring-Boot%2Fmedium%2Flt-17-application-events.md) |  |

### B. Spring Framework: Testing

| Chủ đề | Mức quan trọng | Độ phủ | Bài liên quan | Ghi chú |
|---|---|---|---|---|
| TestContext framework, context caching, @DirtiesContext | MUST | 2 | [Testing cơ bản](/go?p=01-Spring-Boot%2Feasy%2Flt-12-testing-co-ban.md), [QA Java hỏi xoáy](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-23-java-hoi-xoay-tu-sach.md) | Cache context chỉ nói ngắn |
| MockMvc, @WebMvcTest, @MockitoBean | MUST | 3 | [Testing cơ bản](/go?p=01-Spring-Boot%2Feasy%2Flt-12-testing-co-ban.md), [Security chuyên sâu](/go?p=01-Spring-Boot%2Fhard%2Flt-35-spring-security-chuyen-sau.md) |  |
| @SpringBootTest, test slice (@DataJpaTest, @JsonTest, @RestClientTest, @DataRedisTest...) | MUST | 2 | [Testing cơ bản](/go?p=01-Spring-Boot%2Feasy%2Flt-12-testing-co-ban.md), [Concept map](/go?p=01-Spring-Boot%2Fconcept-map.md) | @JsonTest/@RestClientTest chỉ nhắc tên |
| WebTestClient / RestTestClient | SHOULD | 1 | [Testing cơ bản](/go?p=01-Spring-Boot%2Feasy%2Flt-12-testing-co-ban.md) |  |
| @Sql, @Transactional trong test, rollback mặc định | SHOULD | 1 | [Testing cơ bản](/go?p=01-Spring-Boot%2Feasy%2Flt-12-testing-co-ban.md), [QA Java hỏi xoáy](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-23-java-hoi-xoay-tu-sach.md) |  |
| Test auto-configuration (ApplicationContextRunner) | SHOULD | 2 | [Auto-configuration](/go?p=01-Spring-Boot%2Fmedium%2Flt-14-autoconfiguration.md) |  |

### C. Spring Framework: Data Access

| Chủ đề | Mức quan trọng | Độ phủ | Bài liên quan | Ghi chú |
|---|---|---|---|---|
| Transaction: propagation, isolation, rollback rule, readOnly, pitfall proxy | MUST | 3 | [Transaction](/go?p=01-Spring-Boot%2Fmedium%2Flt-05-transaction.md), [Transaction chuyên sâu](/go?p=01-Spring-Boot%2Fhard%2Flt-31-transaction-chuyen-sau.md), [DB transaction, isolation](/go?p=02-Database%2Fmedium%2Flt-04-transaction-isolation-lock.md) |  |
| TransactionTemplate, TransactionSynchronization (after commit) | MUST | 3 | [Transaction](/go?p=01-Spring-Boot%2Fmedium%2Flt-05-transaction.md), [Transaction chuyên sâu](/go?p=01-Spring-Boot%2Fhard%2Flt-31-transaction-chuyen-sau.md), [Application Event](/go?p=01-Spring-Boot%2Fmedium%2Flt-17-application-events.md) |  |
| Dual write, transaction và message | MUST | 3 | [Transaction chuyên sâu](/go?p=01-Spring-Boot%2Fhard%2Flt-31-transaction-chuyen-sau.md), [Event-driven Kafka](/go?p=01-Spring-Boot%2Fhard%2Flt-07-event-driven-kafka.md) |  |
| Spring JDBC: JdbcTemplate/JdbcClient, NamedParameter, batch | SHOULD | 1 | [QA Spring cơ bản](/go?p=07-Interview-QA%2FBackend%2Feasy%2Fqa-02-spring-co-ban.md), [QA Hibernate/JPA](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-12-hibernate-jpa.md) | Chỉ nhắc tên trong QA; không bài nào dạy |
| Exception translation (@Repository, DataAccessException) | SHOULD | 2 | [QA Spring cơ bản](/go?p=07-Interview-QA%2FBackend%2Feasy%2Fqa-02-spring-co-ban.md) |  |
| Multi DataSource, read/write routing (AbstractRoutingDataSource) | SHOULD | 0 | [Concept map](/go?p=01-Spring-Boot%2Fconcept-map.md) | Concept map ghi Chưa |
| R2DBC | NICE | 1 | [WebFlux](/go?p=01-Spring-Boot%2Fhard%2Flt-21-webflux-reactor.md) |  |
| ORM/JPA: persistence context, flush, lazy, equals/hashCode | MUST | 3 | [JPA bên trong](/go?p=01-Spring-Boot%2Fmedium%2Flt-16-jpa-internals.md), [QA Hibernate/JPA](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-12-hibernate-jpa.md) |  |
| Connection pool HikariCP | MUST | 3 | [JPA hiệu năng, lock, cache](/go?p=01-Spring-Boot%2Fhard%2Flt-34-jpa-hieu-nang-khoa-cache.md), [QA Boot nâng cao](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-15-spring-boot-nang-cao.md) |  |

### D. Spring Framework: Web (Servlet)

| Chủ đề | Mức quan trọng | Độ phủ | Bài liên quan | Ghi chú |
|---|---|---|---|---|
| DispatcherServlet, HandlerMapping/Adapter | MUST | 3 | [MVC bên trong](/go?p=01-Spring-Boot%2Fmedium%2Flt-15-mvc-internals.md), [QA Spring cơ bản](/go?p=07-Interview-QA%2FBackend%2Feasy%2Fqa-02-spring-co-ban.md), [QA Servlet/Tomcat](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-10-servlet-tomcat-web-server.md) |  |
| Filter vs HandlerInterceptor vs ControllerAdvice | MUST | 3 | [MVC bên trong](/go?p=01-Spring-Boot%2Fmedium%2Flt-15-mvc-internals.md) |  |
| Annotated controllers: mapping, tham số, ResponseEntity | MUST | 3 | [REST Controller](/go?p=01-Spring-Boot%2Feasy%2Flt-03-rest-controller.md), [MVC bên trong](/go?p=01-Spring-Boot%2Fmedium%2Flt-15-mvc-internals.md) |  |
| Xử lý lỗi: @RestControllerAdvice, ProblemDetail (RFC 9457) | MUST | 3 | [REST API thực chiến](/go?p=01-Spring-Boot%2Fmedium%2Flt-33-rest-api-thuc-chien.md), [REST Controller](/go?p=01-Spring-Boot%2Feasy%2Flt-03-rest-controller.md), [MVC bên trong](/go?p=01-Spring-Boot%2Fmedium%2Flt-15-mvc-internals.md) |  |
| HttpMessageConverter, content negotiation | MUST | 2 | [MVC bên trong](/go?p=01-Spring-Boot%2Fmedium%2Flt-15-mvc-internals.md), [QA Spring cơ bản](/go?p=07-Interview-QA%2FBackend%2Feasy%2Fqa-02-spring-co-ban.md) | Content negotiation chỉ nhắc tên |
| HandlerMethodArgumentResolver tự viết | SHOULD | 3 | [MVC bên trong](/go?p=01-Spring-Boot%2Fmedium%2Flt-15-mvc-internals.md) |  |
| Functional endpoints (RouterFunction) | NICE | 0 | - |  |
| URI links (UriComponentsBuilder, MvcUriComponentsBuilder) | SHOULD | 1 | [REST API thực chiến](/go?p=01-Spring-Boot%2Fmedium%2Flt-33-rest-api-thuc-chien.md) |  |
| CORS (global, @CrossOrigin, với Security) | MUST | 2 | [Security chuyên sâu](/go?p=01-Spring-Boot%2Fhard%2Flt-35-spring-security-chuyen-sau.md) | @CrossOrigin chưa có |
| Async request: Callable, DeferredResult, StreamingResponseBody | SHOULD | 1 | [Concept map](/go?p=01-Spring-Boot%2Fconcept-map.md), [Scheduling và Async](/go?p=01-Spring-Boot%2Fmedium%2Flt-18-scheduling-async.md) | Chỉ concept map |
| SSE (SseEmitter) | SHOULD | 0 | - |  |
| WebSocket/STOMP | NICE | 1 | [WebFlux](/go?p=01-Spring-Boot%2Fhard%2Flt-21-webflux-reactor.md), [QA Boot nâng cao](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-15-spring-boot-nang-cao.md) | Chỉ nhắc tên |
| HTTP caching: ETag, Cache-Control, ShallowEtagHeaderFilter | SHOULD | 2 | [REST API thực chiến](/go?p=01-Spring-Boot%2Fmedium%2Flt-33-rest-api-thuc-chien.md) | ETag cho optimistic locking có; Cache-Control 1 dòng |
| Multipart/upload file | SHOULD | 0 | - |  |
| API versioning (native Framework 7 / Boot 4) | SHOULD | 2 | [REST API thực chiến](/go?p=01-Spring-Boot%2Fmedium%2Flt-33-rest-api-thuc-chien.md) | Bàn về chiến lược, chưa có cơ chế native |
| View technologies (Thymeleaf, JSP, FreeMarker) | SKIP | 1 | [QA Servlet/Tomcat](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-10-servlet-tomcat-web-server.md) |  |

### E. Spring Framework: REST client, Reactive, Integration

| Chủ đề | Mức quan trọng | Độ phủ | Bài liên quan | Ghi chú |
|---|---|---|---|---|
| RestClient (cấu hình timeout, interceptor, error handling) | MUST | 2 | [Resilience](/go?p=01-Spring-Boot%2Fhard%2Flt-32-resilience-chiu-loi.md), [QA Spring nội bộ](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-04-spring-noi-bo.md) | Có 1 đoạn code trong resilience; chưa có bài riêng |
| HTTP Service interface (@HttpExchange, HttpServiceProxyFactory) | SHOULD | 1 | [Concept map](/go?p=01-Spring-Boot%2Fconcept-map.md), [QA Spring nội bộ](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-04-spring-noi-bo.md) | Chỉ nhắc tên |
| WebClient | SHOULD | 2 | [WebFlux](/go?p=01-Spring-Boot%2Fhard%2Flt-21-webflux-reactor.md) |  |
| RestTemplate (legacy), RestTemplate sang RestClient | NICE | 1 | [QA Spring nội bộ](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-04-spring-noi-bo.md) |  |
| WebFlux, Reactor, backpressure | SHOULD | 3 | [WebFlux](/go?p=01-Spring-Boot%2Fhard%2Flt-21-webflux-reactor.md) |  |
| Cache abstraction: @Cacheable/@CacheEvict/@CachePut, CacheManager, sync | MUST | 3 | [Redis cache pattern](/go?p=06-Distributed-Systems%2FRedis%2Fmedium%2Flt-03-cache-pattern-van-de-cache.md), [QA Spring nội bộ](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-04-spring-noi-bo.md) | Chỉ nằm ở Redis, không trong thư mục Spring Boot; Caffeine 1 dòng |
| Scheduling, TaskExecutor, @Async, context propagation | MUST | 3 | [Scheduling và Async](/go?p=01-Spring-Boot%2Fmedium%2Flt-18-scheduling-async.md) |  |
| Retry (Spring Framework 7 @Retryable, @ConcurrencyLimit) | SHOULD | 1 | [Resilience](/go?p=01-Spring-Boot%2Fhard%2Flt-32-resilience-chiu-loi.md) | Chỉ có Resilience4j |
| JMS/JavaMail | SKIP | 1 | [Concept map](/go?p=01-Spring-Boot%2Fconcept-map.md) |  |
| Observability: Micrometer Observation, @Observed | MUST | 3 | [Observability](/go?p=01-Spring-Boot%2Fmedium%2Flt-19-observability.md) |  |

### F. Spring Boot

| Chủ đề | Mức quan trọng | Độ phủ | Bài liên quan | Ghi chú |
|---|---|---|---|---|
| Build systems, BOM, starter, dependency management | MUST | 2 | [Giới thiệu Boot](/go?p=01-Spring-Boot%2Feasy%2Flt-01-gioi-thieu-spring-boot.md) | Không có bài về Maven/Gradle plugin, override version BOM |
| Structuring code, @SpringBootApplication, component scan | MUST | 3 | [Giới thiệu Boot](/go?p=01-Spring-Boot%2Feasy%2Flt-01-gioi-thieu-spring-boot.md), [Khởi động ApplicationContext](/go?p=01-Spring-Boot%2Fhard%2Flt-30-spring-khoi-dong-application-context.md) |  |
| Auto-configuration, @Conditional*, AutoConfiguration.imports | MUST | 3 | [Auto-configuration](/go?p=01-Spring-Boot%2Fmedium%2Flt-14-autoconfiguration.md), [QA Boot nâng cao](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-15-spring-boot-nang-cao.md) |  |
| Tự viết starter/auto-configuration, configuration metadata | SHOULD | 3 | [Auto-configuration](/go?p=01-Spring-Boot%2Fmedium%2Flt-14-autoconfiguration.md) | Annotation processor metadata chưa có |
| SpringApplication: event, Runner, lazy init, banner, failure analyzer | SHOULD | 3 | [Khởi động ApplicationContext](/go?p=01-Spring-Boot%2Fhard%2Flt-30-spring-khoi-dong-application-context.md), [Bean lifecycle](/go?p=01-Spring-Boot%2Feasy%2Flt-10-bean-lifecycle.md) | FailureAnalyzer chưa có |
| Externalized config, @ConfigurationProperties, relaxed binding, validate | MUST | 3 | [Cấu hình và Profile](/go?p=01-Spring-Boot%2Feasy%2Flt-11-config-profile.md) |  |
| Profiles | MUST | 3 | [Cấu hình và Profile](/go?p=01-Spring-Boot%2Feasy%2Flt-11-config-profile.md) |  |
| Logging: Logback, level runtime, log group, structured logging | MUST | 2 | [Observability](/go?p=01-Spring-Boot%2Fmedium%2Flt-19-observability.md), [QA Java hỏi xoáy](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-23-java-hoi-xoay-tu-sach.md) | Không có bài riêng về cấu hình logging của Boot |
| JSON/Jackson: ObjectMapper, @JsonView, mixin, kiểu thời gian | MUST | 2 | [QA Serialization/JSON](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-11-serialization-json.md), [REST API thực chiến](/go?p=01-Spring-Boot%2Fmedium%2Flt-33-rest-api-thuc-chien.md) | @JsonView = 0 |
| Task execution, virtual threads (spring.threads.virtual.enabled) | MUST | 3 | [Virtual threads](/go?p=01-Spring-Boot%2Fhard%2Flt-22-concurrency-virtual-threads.md), [Scheduling và Async](/go?p=01-Spring-Boot%2Fmedium%2Flt-18-scheduling-async.md), [QA Servlet/Tomcat](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-10-servlet-tomcat-web-server.md) |  |
| Docker Compose support (spring-boot-docker-compose) | SHOULD | 0 | - | Chỉ nhắc docker-compose trong đồ án |
| Testcontainers support, @ServiceConnection, @DynamicPropertySource | MUST | 3 | [Testing nâng cao](/go?p=01-Spring-Boot%2Fhard%2Flt-27-advanced-testing.md) |  |
| SSL bundles, mTLS | SHOULD | 0 | - |  |
| DevTools | NICE | 0 | - |  |
| Graceful shutdown | MUST | 3 | [Docker và Kubernetes](/go?p=01-Spring-Boot%2Fhard%2Flt-29-docker-kubernetes.md), [Bean lifecycle](/go?p=01-Spring-Boot%2Feasy%2Flt-10-bean-lifecycle.md) |  |
| Embedded server: Tomcat thread, max-connections, keep-alive, nén | MUST | 2 | [Virtual threads](/go?p=01-Spring-Boot%2Fhard%2Flt-22-concurrency-virtual-threads.md), [QA Servlet/Tomcat](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-10-servlet-tomcat-web-server.md) |  |
| SQL data: DataSource, JPA props, open-in-view, schema init | MUST | 3 | [Spring Data JPA](/go?p=01-Spring-Boot%2Fmedium%2Flt-04-spring-data-jpa.md), [JPA hiệu năng, lock, cache](/go?p=01-Spring-Boot%2Fhard%2Flt-34-jpa-hieu-nang-khoa-cache.md), [Transaction chuyên sâu](/go?p=01-Spring-Boot%2Fhard%2Flt-31-transaction-chuyen-sau.md) |  |
| Migration Flyway/Liquibase, migration không downtime | MUST | 2 | [Spring Data JPA](/go?p=01-Spring-Boot%2Fmedium%2Flt-04-spring-data-jpa.md), [JPA hiệu năng, lock, cache](/go?p=01-Spring-Boot%2Fhard%2Flt-34-jpa-hieu-nang-khoa-cache.md) | Chỉ nhắc, chưa có bài expand/contract |
| NoSQL: Spring Data Redis (Lettuce, RedisTemplate, serializer) | SHOULD | 2 | [Redis tổng quan](/go?p=06-Distributed-Systems%2FRedis%2Feasy%2Flt-01-redis-tong-quan-cau-truc-du-lieu.md), [Distributed lock](/go?p=01-Spring-Boot%2Fhard%2Flt-26-distributed-lock-idempotency.md), [Redis cache pattern](/go?p=06-Distributed-Systems%2FRedis%2Fmedium%2Flt-03-cache-pattern-van-de-cache.md) | Rải rác trong thư mục Redis |
| NoSQL khác: MongoDB, Elasticsearch | NICE | 0 | - |  |
| Kafka support trong Boot (spring.kafka.*) | MUST | 3 | [Spring Kafka thực chiến](/go?p=06-Distributed-Systems%2FKafka%2Fmedium%2Flt-03-spring-kafka-thuc-chien.md), [Event-driven Kafka](/go?p=01-Spring-Boot%2Fhard%2Flt-07-event-driven-kafka.md) |  |
| AMQP/RabbitMQ | SHOULD | 1 | [Concept map](/go?p=01-Spring-Boot%2Fconcept-map.md) | Chỉ so sánh trong Kafka tổng quan |
| Spring Session (Redis/JDBC) | SHOULD | 1 | [QA Servlet/Tomcat](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-10-servlet-tomcat-web-server.md) |  |
| Quartz, Spring Batch auto-config | SHOULD | 3 | [Spring Batch](/go?p=01-Spring-Boot%2Fhard%2Flt-28-spring-batch.md), [Scheduling và Async](/go?p=01-Spring-Boot%2Fmedium%2Flt-18-scheduling-async.md) | Quartz 1 dòng |
| Email, Spring Integration, GraphQL, gRPC, HATEOAS, RSocket | NICE | 0 | - |  |
| Container images: layered jar, buildpacks, Dockerfile | MUST | 3 | [Docker và Kubernetes](/go?p=01-Spring-Boot%2Fhard%2Flt-29-docker-kubernetes.md) |  |
| AOT cache / CDS / CRaC | SHOULD | 1 | [Khởi động ApplicationContext](/go?p=01-Spring-Boot%2Fhard%2Flt-30-spring-khoi-dong-application-context.md), [Docker và Kubernetes](/go?p=01-Spring-Boot%2Fhard%2Flt-29-docker-kubernetes.md) |  |
| GraalVM native image | SHOULD | 1 | [Docker và Kubernetes](/go?p=01-Spring-Boot%2Fhard%2Flt-29-docker-kubernetes.md), [Khởi động ApplicationContext](/go?p=01-Spring-Boot%2Fhard%2Flt-30-spring-khoi-dong-application-context.md) | Đánh đổi có, thực hành không |
| Actuator: endpoint, exposure, bảo vệ, health group/probe | MUST | 3 | [Observability](/go?p=01-Spring-Boot%2Fmedium%2Flt-19-observability.md), [Docker và Kubernetes](/go?p=01-Spring-Boot%2Fhard%2Flt-29-docker-kubernetes.md) |  |
| Actuator endpoint khác: info, env, beans, conditions, mappings, threaddump, heapdump, startup, scheduledtasks | SHOULD | 1 | [Auto-configuration](/go?p=01-Spring-Boot%2Fmedium%2Flt-14-autoconfiguration.md), [QA Spring cơ bản](/go?p=07-Interview-QA%2FBackend%2Feasy%2Fqa-02-spring-co-ban.md) | Chỉ rải rác |
| Metrics (Micrometer), tracing (OpenTelemetry) | MUST | 2 | [Observability](/go?p=01-Spring-Boot%2Fmedium%2Flt-19-observability.md) | Tracing bridge/propagation chỉ ở mức cấu hình |
| Executable jar, PropertiesLauncher | NICE | 0 | - |  |
| Spring Boot 4 / Framework 7 / Jackson 3 / modularization (thay đổi so với Boot 3) | SHOULD | 0 | - | Toàn bộ tài liệu bám Boot 3; chưa có bài migration |

### G. Spring Data JPA

| Chủ đề | Mức quan trọng | Độ phủ | Bài liên quan | Ghi chú |
|---|---|---|---|---|
| Repository, query derivation, @Query, @Modifying | MUST | 3 | [Spring Data JPA](/go?p=01-Spring-Boot%2Fmedium%2Flt-04-spring-data-jpa.md), [JPA hiệu năng, lock, cache](/go?p=01-Spring-Boot%2Fhard%2Flt-34-jpa-hieu-nang-khoa-cache.md) |  |
| Projections (interface, DTO, dynamic) | MUST | 3 | [JPA hiệu năng, lock, cache](/go?p=01-Spring-Boot%2Fhard%2Flt-34-jpa-hieu-nang-khoa-cache.md), [Spring Data JPA](/go?p=01-Spring-Boot%2Fmedium%2Flt-04-spring-data-jpa.md) |  |
| Specifications / truy vấn động | MUST | 1 | [QA Hibernate/JPA](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-12-hibernate-jpa.md) | Chỉ 1 dòng trong QA, không code |
| Query by Example | NICE | 0 | - |  |
| Paging: Pageable, Slice, keyset, Window/Scroll | MUST | 3 | [JPA hiệu năng, lock, cache](/go?p=01-Spring-Boot%2Fhard%2Flt-34-jpa-hieu-nang-khoa-cache.md), [Spring Data JPA](/go?p=01-Spring-Boot%2Fmedium%2Flt-04-spring-data-jpa.md) |  |
| @EntityGraph, join fetch, @BatchSize, N+1 | MUST | 3 | [Spring Data JPA](/go?p=01-Spring-Boot%2Fmedium%2Flt-04-spring-data-jpa.md), [JPA hiệu năng, lock, cache](/go?p=01-Spring-Boot%2Fhard%2Flt-34-jpa-hieu-nang-khoa-cache.md), [QA Hibernate/JPA](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-12-hibernate-jpa.md) |  |
| Locking: @Version, @Lock PESSIMISTIC | MUST | 3 | [JPA hiệu năng, lock, cache](/go?p=01-Spring-Boot%2Fhard%2Flt-34-jpa-hieu-nang-khoa-cache.md), [QA Hibernate/JPA](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-12-hibernate-jpa.md) |  |
| Auditing (@CreatedDate, @LastModifiedBy, AuditorAware) | SHOULD | 0 | [Concept map](/go?p=01-Spring-Boot%2Fconcept-map.md) | Concept map ghi Chưa |
| Transactionality của repository (readOnly mặc định, SimpleJpaRepository) | MUST | 2 | [Transaction chuyên sâu](/go?p=01-Spring-Boot%2Fhard%2Flt-31-transaction-chuyen-sau.md), [Spring Data JPA](/go?p=01-Spring-Boot%2Fmedium%2Flt-04-spring-data-jpa.md) |  |
| Custom repository implementation (fragment, Impl) | SHOULD | 0 | - |  |
| Mapping nâng cao: @Embeddable, AttributeConverter, inheritance, soft delete, enum | SHOULD | 1 | [Concept map](/go?p=01-Spring-Boot%2Fconcept-map.md), [QA Hibernate/JPA](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-12-hibernate-jpa.md) | Hầu như không có |
| Publishing events từ aggregate (@DomainEvents) | SHOULD | 0 | [Hexagonal, DDD, Modulith](/go?p=01-Spring-Boot%2Fhard%2Flt-24-hexagonal-ddd-modulith.md) |  |
| Hibernate second-level cache | SHOULD | 2 | [JPA hiệu năng, lock, cache](/go?p=01-Spring-Boot%2Fhard%2Flt-34-jpa-hieu-nang-khoa-cache.md) |  |
| Querydsl, Stored procedure, Envers, Vector Search | NICE | 0 | [QA Hibernate/JPA](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-12-hibernate-jpa.md) | Querydsl chỉ nhắc tên |
| Spring Data JDBC | NICE | 0 | - |  |

### H. Spring Security

| Chủ đề | Mức quan trọng | Độ phủ | Bài liên quan | Ghi chú |
|---|---|---|---|---|
| Kiến trúc: DelegatingFilterProxy, SecurityFilterChain, SecurityContext | MUST | 3 | [Security chuyên sâu](/go?p=01-Spring-Boot%2Fhard%2Flt-35-spring-security-chuyen-sau.md), [Security và JWT](/go?p=01-Spring-Boot%2Fmedium%2Flt-06-spring-security-jwt.md) |  |
| Authentication: AuthenticationManager/Provider, UserDetailsService | MUST | 3 | [Security và JWT](/go?p=01-Spring-Boot%2Fmedium%2Flt-06-spring-security-jwt.md), [Security chuyên sâu](/go?p=01-Spring-Boot%2Fhard%2Flt-35-spring-security-chuyen-sau.md) |  |
| Password storage: DelegatingPasswordEncoder, BCrypt/Argon2 | MUST | 2 | [Security chuyên sâu](/go?p=01-Spring-Boot%2Fhard%2Flt-35-spring-security-chuyen-sau.md), [Security và JWT](/go?p=01-Spring-Boot%2Fmedium%2Flt-06-spring-security-jwt.md) |  |
| Form login, Basic, remember-me, logout | SHOULD | 1 | [Security và JWT](/go?p=01-Spring-Boot%2Fmedium%2Flt-06-spring-security-jwt.md) | remember-me = 0 |
| Session management: fixation, concurrency, SessionCreationPolicy | SHOULD | 1 | [Security chuyên sâu](/go?p=01-Spring-Boot%2Fhard%2Flt-35-spring-security-chuyen-sau.md), [QA Spring nội bộ](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-04-spring-noi-bo.md) |  |
| OAuth2 Login/Client (authorized client, token relay) | MUST | 3 | [OAuth2 và OIDC](/go?p=01-Spring-Boot%2Fmedium%2Flt-20-oauth2-oidc.md) |  |
| Resource server JWT | MUST | 3 | [OAuth2 và OIDC](/go?p=01-Spring-Boot%2Fmedium%2Flt-20-oauth2-oidc.md), [Security chuyên sâu](/go?p=01-Spring-Boot%2Fhard%2Flt-35-spring-security-chuyen-sau.md) |  |
| Resource server opaque token / introspection, multitenancy | SHOULD | 1 | [OAuth2 và OIDC](/go?p=01-Spring-Boot%2Fmedium%2Flt-20-oauth2-oidc.md) | Chỉ nhắc |
| Authorization Server (Spring Authorization Server, Keycloak) | NICE | 1 | [OAuth2 và OIDC](/go?p=01-Spring-Boot%2Fmedium%2Flt-20-oauth2-oidc.md) | Có Keycloak, chưa có SAS |
| Authorize HTTP requests, AuthorizationManager | MUST | 2 | [Security chuyên sâu](/go?p=01-Spring-Boot%2Fhard%2Flt-35-spring-security-chuyen-sau.md) | AuthorizationManager = 0 |
| Method security: @PreAuthorize/@PostAuthorize/@PostFilter | MUST | 3 | [Security chuyên sâu](/go?p=01-Spring-Boot%2Fhard%2Flt-35-spring-security-chuyen-sau.md), [Security và JWT](/go?p=01-Spring-Boot%2Fmedium%2Flt-06-spring-security-jwt.md) |  |
| CSRF | MUST | 3 | [Security chuyên sâu](/go?p=01-Spring-Boot%2Fhard%2Flt-35-spring-security-chuyen-sau.md) |  |
| CORS trong Security | MUST | 3 | [Security chuyên sâu](/go?p=01-Spring-Boot%2Fhard%2Flt-35-spring-security-chuyen-sau.md) |  |
| Security headers (HSTS, CSP, X-Frame-Options) | SHOULD | 1 | [Security chuyên sâu](/go?p=01-Spring-Boot%2Fhard%2Flt-35-spring-security-chuyen-sau.md) |  |
| Security testing (@WithMockUser, jwt(), csrf()) | MUST | 2 | [Security chuyên sâu](/go?p=01-Spring-Boot%2Fhard%2Flt-35-spring-security-chuyen-sau.md), [Security và JWT](/go?p=01-Spring-Boot%2Fmedium%2Flt-06-spring-security-jwt.md), [OAuth2 và OIDC](/go?p=01-Spring-Boot%2Fmedium%2Flt-20-oauth2-oidc.md) |  |
| SAML, LDAP, MFA, Passkeys, One-time token, Kerberos | NICE | 0 | - | Chỉ cần biết tên |

### I. Spring for Apache Kafka

| Chủ đề | Mức quan trọng | Độ phủ | Bài liên quan | Ghi chú |
|---|---|---|---|---|
| KafkaTemplate, producer config, callback | MUST | 3 | [Spring Kafka thực chiến](/go?p=06-Distributed-Systems%2FKafka%2Fmedium%2Flt-03-spring-kafka-thuc-chien.md), [Kafka producer/consumer](/go?p=06-Distributed-Systems%2FKafka%2Fmedium%2Flt-02-producer-consumer-delivery.md) |  |
| @KafkaListener, container concurrency, AckMode | MUST | 3 | [Spring Kafka thực chiến](/go?p=06-Distributed-Systems%2FKafka%2Fmedium%2Flt-03-spring-kafka-thuc-chien.md) |  |
| Error handling: DefaultErrorHandler, BackOff, recoverer | MUST | 3 | [Spring Kafka thực chiến](/go?p=06-Distributed-Systems%2FKafka%2Fmedium%2Flt-03-spring-kafka-thuc-chien.md), [QA Kafka chuyên sâu](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-21-kafka-chuyen-sau.md) |  |
| Non-blocking retry @RetryableTopic, DLT | MUST | 3 | [Spring Kafka thực chiến](/go?p=06-Distributed-Systems%2FKafka%2Fmedium%2Flt-03-spring-kafka-thuc-chien.md), [Event-driven Kafka](/go?p=01-Spring-Boot%2Fhard%2Flt-07-event-driven-kafka.md), [QA Kafka chuyên sâu](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-21-kafka-chuyen-sau.md) |  |
| Transactions, exactly-once, outbox | MUST | 3 | [Kafka vận hành, EOS](/go?p=06-Distributed-Systems%2FKafka%2Fhard%2Flt-05-kafka-van-hanh-exactly-once.md), [Spring Kafka thực chiến](/go?p=06-Distributed-Systems%2FKafka%2Fmedium%2Flt-03-spring-kafka-thuc-chien.md), [Event-driven Kafka](/go?p=01-Spring-Boot%2Fhard%2Flt-07-event-driven-kafka.md) |  |
| Serialization, ErrorHandlingDeserializer, Schema Registry | MUST | 3 | [Spring Kafka thực chiến](/go?p=06-Distributed-Systems%2FKafka%2Fmedium%2Flt-03-spring-kafka-thuc-chien.md), [Kafka vận hành, EOS](/go?p=06-Distributed-Systems%2FKafka%2Fhard%2Flt-05-kafka-van-hanh-exactly-once.md) |  |
| Testing: EmbeddedKafka, Testcontainers | MUST | 2 | [Spring Kafka thực chiến](/go?p=06-Distributed-Systems%2FKafka%2Fmedium%2Flt-03-spring-kafka-thuc-chien.md), [Testing nâng cao](/go?p=01-Spring-Boot%2Fhard%2Flt-27-advanced-testing.md) |  |
| Batch listener | SHOULD | 0 | - |  |
| Rebalance listener, seek (ConsumerSeekAware), pause/resume | SHOULD | 1 | [Kafka producer/consumer](/go?p=06-Distributed-Systems%2FKafka%2Fmedium%2Flt-02-producer-consumer-delivery.md) |  |
| Request-reply, @SendTo, filtering, @KafkaListener lifecycle | NICE | 0 | - |  |
| Monitoring: Micrometer, consumer lag | MUST | 3 | [Kafka vận hành, EOS](/go?p=06-Distributed-Systems%2FKafka%2Fhard%2Flt-05-kafka-van-hanh-exactly-once.md) |  |
| Kafka Streams, Share Consumer (Queues) | NICE | 1 | [Kafka vận hành, EOS](/go?p=06-Distributed-Systems%2FKafka%2Fhard%2Flt-05-kafka-van-hanh-exactly-once.md) |  |

### J. Spring Cloud, Batch, Modulith

| Chủ đề | Mức quan trọng | Độ phủ | Bài liên quan | Ghi chú |
|---|---|---|---|---|
| Spring Cloud Gateway (route, filter, rate limit) | SHOULD | 2 | [Microservices](/go?p=01-Spring-Boot%2Fhard%2Flt-08-microservices-spring-cloud.md), [QA Microservices/Kafka](/go?p=07-Interview-QA%2FBackend%2Fhard%2Fqa-16-microservices-kafka-phan-tan.md) | Có YAML route; filter tùy biến và RequestRateLimiter chỉ ở QA |
| Spring Cloud Config, @RefreshScope | SHOULD | 1 | [Microservices](/go?p=01-Spring-Boot%2Fhard%2Flt-08-microservices-spring-cloud.md) |  |
| Circuit breaker / Resilience4j | MUST | 3 | [Resilience](/go?p=01-Spring-Boot%2Fhard%2Flt-32-resilience-chiu-loi.md), [Microservices](/go?p=01-Spring-Boot%2Fhard%2Flt-08-microservices-spring-cloud.md) |  |
| LoadBalancer, service discovery (Eureka/K8s) | SHOULD | 1 | [Microservices](/go?p=01-Spring-Boot%2Fhard%2Flt-08-microservices-spring-cloud.md) |  |
| OpenFeign / HTTP interfaces | SHOULD | 1 | [Microservices](/go?p=01-Spring-Boot%2Fhard%2Flt-08-microservices-spring-cloud.md) |  |
| Spring Cloud Stream, Function, Kubernetes, Contract | NICE | 1 | [Testing nâng cao](/go?p=01-Spring-Boot%2Fhard%2Flt-27-advanced-testing.md) | Contract test có; còn lại chưa |
| Spring Batch (job, step, chunk, restart) | SHOULD | 3 | [Spring Batch](/go?p=01-Spring-Boot%2Fhard%2Flt-28-spring-batch.md) |  |
| Spring Modulith (module, verify, @ApplicationModuleListener, event publication) | SHOULD | 3 | [Hexagonal, DDD, Modulith](/go?p=01-Spring-Boot%2Fhard%2Flt-24-hexagonal-ddd-modulith.md) |  |
| Saga, outbox, CQRS | SHOULD | 3 | [Microservices](/go?p=01-Spring-Boot%2Fhard%2Flt-08-microservices-spring-cloud.md), [Event-driven Kafka](/go?p=01-Spring-Boot%2Fhard%2Flt-07-event-driven-kafka.md), [CQRS và Event Sourcing](/go?p=01-Spring-Boot%2Fhard%2Flt-25-cqrs-event-sourcing.md) |  |

## 3. Khoảng trống cần bổ sung (xếp ưu tiên)

> Cập nhật: các mục 1 đến 19 dưới đây đã được bù bằng các bài lt-36 đến lt-39 và các mục thêm vào bài sẵn có; `concept-map.md` đã được cập nhật. Bảng giữ lại để theo dõi lịch sử và để đối chiếu khi tài liệu chính thức đổi phiên bản.

Chỉ liệt kê chủ đề MUST/SHOULD có độ phủ <= 1, cộng một số MUST ở mức 2 mà phỏng vấn hay hỏi. Mọi đề xuất giữ phong cách ghi chú rút gọn (dạng hướng dẫn, bảng, 1 đến 2 ví dụ code).

| # | Ưu tiên | Khoảng trống | Đề xuất cụ thể | Dung lượng |
|---|---|---|---|---|
| 1 | MUST (mức 2) | Outbound HTTP call: RestClient + HTTP Service interface (@HttpExchange) + WebClient + timeout/interceptor/error handler | Tạo bài mới `01-Spring-Boot/medium/lt-36-http-client-restclient.md`; liên kết từ bài Resilience và Microservices | 900 từ |
| 2 | MUST/SHOULD | Spring Data JPA nâng cao: Specification, Auditing (`@EnableJpaAuditing`, `AuditorAware`), custom repository (fragment), `@DomainEvents` | Tạo bài mới `01-Spring-Boot/medium/lt-37-spring-data-jpa-nang-cao.md`; Specification lấy từ câu ngắn của qa-12 làm gốc | 1000 từ |
| 3 | SHOULD | Boot 4 / Framework 7 / Spring Security 7: Jackson 3, modularization starter, `@Retryable` native, API versioning native, JSpecify, `RestTestClient` | Tạo bài mới `01-Spring-Boot/hard/lt-38-boot4-framework7-thay-doi.md`; đánh dấu rõ các bài khác viết cho Boot 3 | 800 từ |
| 4 | SHOULD | SpEL và ConversionService/Formatter/Converter | Thêm mục "SpEL và type conversion" vào `lt-09-tu-duy-spring.md` hoặc `lt-15-mvc-internals.md`; cập nhật dòng SpEL ở concept-map | 450 từ |
| 5 | SHOULD | Validation nâng cao: groups, `ConstraintValidator`, method validation (`@Validated` trên service), `MethodArgumentNotValidException` vs `HandlerMethodValidationException` | Thêm mục vào `medium/lt-33-rest-api-thuc-chien.md` (đã có phần validation) | 400 từ |
| 6 | SHOULD | Scope web (request, session), `ObjectProvider`, scoped proxy | Thêm mục vào `easy/lt-02-ioc-di.md` (cạnh phần Scope) | 250 từ |
| 7 | SHOULD | Multi DataSource + read/write routing (`AbstractRoutingDataSource`), `@Transactional(readOnly)` routing sang replica | Thêm mục vào `hard/lt-31-transaction-chuyen-sau.md` hoặc `02-Database/hard/lt-05-replication-sharding-ha.md` (kèm liên kết) | 400 từ |
| 8 | SHOULD | Spring Data JDBC / JdbcClient / JdbcTemplate (khi bỏ JPA) | Thêm mục "Khi nào dùng JDBC" vào `medium/lt-04-spring-data-jpa.md` | 400 từ |
| 9 | SHOULD | Servlet nâng cao: SSE (`SseEmitter`), `Callable/DeferredResult/StreamingResponseBody`, upload multipart (giới hạn kích thước, streaming) | Thêm mục vào `medium/lt-18-scheduling-async.md` hoặc `lt-33-rest-api-thuc-chien.md` | 500 từ |
| 10 | SHOULD | Cache abstraction nằm ngoài thư mục Spring Boot; thiếu `@CachePut`, `unless`, Caffeine, multi-level | Thêm bài ngắn `01-Spring-Boot/medium/lt-39-spring-cache-abstraction.md` (chuyển phần code từ Redis, liên kết hai chiều) | 600 từ |
| 11 | SHOULD | Actuator endpoint phụ (`conditions`, `mappings`, `threaddump`, `heapdump`, `startup`, `scheduledtasks`, `info`) và cách bảo vệ | Thêm bảng vào `medium/lt-19-observability.md` | 300 từ |
| 12 | SHOULD | Docker Compose support + SSL bundle + DevTools (Dev services) | Thêm mục "Dev services" vào `easy/lt-12-testing-co-ban.md` hoặc `hard/lt-27-advanced-testing.md` (cạnh Testcontainers `@ServiceConnection`) | 400 từ |
| 13 | SHOULD | Logging của Boot: Logback config, log group, structured logging, đổi level runtime | Thêm mục vào `medium/lt-19-observability.md` (đã có MDC, JSON) | 300 từ |
| 14 | SHOULD | AOT, RuntimeHints, GraalVM native, AppCDS/CRaC dạng thực hành | Thêm mục "Khởi động nhanh" vào `hard/lt-30-spring-khoi-dong-application-context.md` | 500 từ |
| 15 | SHOULD | Security: AuthorizationManager, remember-me, security headers, opaque token, session concurrency | Thêm bảng vào `hard/lt-35-spring-security-chuyen-sau.md` | 500 từ |
| 16 | SHOULD | Spring Kafka: batch listener, `ConsumerSeekAware`, pause/resume, listener lifecycle | Thêm mục vào `06-Distributed-Systems/Kafka/medium/lt-03-spring-kafka-thuc-chien.md` | 400 từ |
| 17 | SHOULD | Spring Cloud: Config Server + `@RefreshScope`, LoadBalancer, OpenFeign, Gateway filter tùy biến | Thêm mục vào `hard/lt-08-microservices-spring-cloud.md` (chấp nhận mức 2, nêu rõ phương án thay bằng Kubernetes) | 500 từ |
| 18 | SHOULD | Mapping JPA nâng cao: `@Embeddable`, `AttributeConverter`, kế thừa, `@SQLRestriction`/soft delete, enum | Thêm mục vào `medium/lt-16-jpa-internals.md` | 450 từ |
| 19 | Bảo trì | `concept-map.md` ghi "Chưa" cho nhiều chủ đề đã có bài | Cập nhật cột "Bài" của concept-map sau khi bổ sung | 0 từ mới |

Ghi chú: các chủ đề NICE/SKIP (functional endpoints, Query by Example, Envers, GraphQL, gRPC, RSocket, SAML, JMS, view technology, Cloud Stream, Spring Integration, Kafka Streams) nên giữ ở mức biết tên; không cần viết thêm.

## 4. Nguồn đã tra

Lấy được qua `web_fetch` (mục lục + trang tổng quan):

- https://docs.spring.io/spring-boot/index.html (Spring Boot 4.1.2; mục lục Reference, How-to, Actuator API, Appendix)
- https://docs.spring.io/spring-data/jpa/reference/index.html (Spring Data JPA 4.1.2)
- https://docs.spring.io/spring-security/reference/index.html (Spring Security 7.1.2)
- https://docs.spring.io/spring-kafka/reference/index.html (Spring for Apache Kafka 4.1.2)
- https://docs.spring.io/spring-framework/reference/index.html (lấy được, 631 dòng mục lục; chỉ lướt các mục lớn, phần chi tiết đối chiếu bằng kiến thức)

Không lấy/đối chiếu từ nguồn (ghi theo kiến thức, chưa đối chiếu nguồn):

- Spring Cloud (Gateway, Config, Circuit Breaker, LoadBalancer, OpenFeign, Stream): chỉ thấy danh sách dự án trong thanh điều hướng của trang Boot, chưa mở mục lục từng dự án.
- Spring Batch và Spring Modulith: chỉ biết tên dự án qua điều hướng, nội dung đối chiếu theo kiến thức.
- Lưu ý phiên bản: tài liệu chính thức hiện là Boot 4.1 / Framework 7 / Security 7, trong khi bộ ghi chú bám Boot 3.x. Danh mục chủ đề dùng cấu trúc Boot 4.1 nhưng không có chủ đề nào chỉ tồn tại ở Boot 4 và quan trọng hơn mức SHOULD.

