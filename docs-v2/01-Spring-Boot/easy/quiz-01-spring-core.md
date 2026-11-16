# Trắc nghiệm chuyên sâu: Spring Boot & Spring Framework Core

## 1. Cơ chế IoC, Bean Scope và Transaction

### Câu 1: Vì sao trong Spring Boot, Constructor Injection được khuyến nghị mạnh mẽ hơn Field Injection (`@Autowired` trên biến)?
- [x] Đảm bảo tính bất biến (immutability với từ khóa `final`), tránh lỗi `NullPointerException` khi khởi tạo object trong Unit Test độc lập, và phát hiện lỗi phụ thuộc vòng tròn (circular dependency) ngay thời điểm khởi động.
- [ ] Constructor Injection cho phép khởi tạo bean bất đồng bộ trên luồng nền của JVM, giúp rút ngắn thời gian khởi động của Spring Context.
- [ ] Field Injection chỉ được hỗ trợ trong các ứng dụng monolithic cũ, còn ứng dụng kiến trúc Microservices bắt buộc phải dùng Constructor Injection.
- [ ] Constructor Injection tự động kích hoạt tính năng caching kết quả cho tất cả các phương thức trong class mà không cần thêm `@Cacheable`.

> **Giải thích:** Với Constructor Injection: 1) Các dependency được khai báo `final`, đảm bảo không bị gán lại sau khi tạo bean; 2) Viết Unit Test cực kỳ dễ dàng (chỉ cần gọi `new MyService(mockRepo)` mà không cần khởi động Spring context giả lập hay dùng Reflection); 3) Spring phát hiện ngay lỗi phụ thuộc vòng tròn tại thời điểm khởi tạo ứng dụng thay vì phát sinh runtime exception.

### Câu 2: Khi một phương thức có `@Transactional` được gọi từ một phương thức khác NẰM TRONG CÙNG MỘT CLASS, vì sao Transaction mặc định KHÔNG được áp dụng?
- [x] Vì Spring AOP sử dụng cơ chế Dynamic Proxy; lời gọi nội bộ (self-invocation) qua `this` sẽ gọi trực tiếp target instance thực tế mà không đi qua đối tượng Proxy bọc ngoài.
- [ ] Vì Spring chỉ cho phép mở tối đa một transaction duy nhất trên mỗi luồng request của Tomcat.
- [ ] Vì JVM cấm các phương thức trong cùng một class chia sẻ ngữ cảnh database transaction với nhau.
- [ ] Vì `@Transactional` bắt buộc phải đi kèm với annotation `@Async` thì mới có thể kích hoạt cơ chế ủy quyền nội bộ.

> **Giải thích:** Mọi tính năng AOP của Spring (`@Transactional`, `@Async`, `@Cacheable`) hoạt động bằng cách tạo một đối tượng Proxy bọc quanh Bean thực tế. Khi phương thức A gọi phương thức B trong cùng một class (`this.b()`), cuộc gọi xảy ra bên trong đối tượng thực, hoàn toàn bỏ qua Proxy -> Logic mở và commit transaction không được kích hoạt. Cách khắc phục: Tách phương thức B sang service khác hoặc inject chính Bean đó vào chính nó (self-injection).

### Câu 3: Theo cấu hình mặc định của Spring Framework, nhóm ngoại lệ nào sẽ kích hoạt cơ chế tự động Rollback của `@Transactional`?
- [x] Chỉ các ngoại lệ không kiểm tra (Unchecked Exceptions - kế thừa từ `RuntimeException` hoặc `Error`).
- [ ] Tất cả các ngoại lệ kế thừa từ `java.lang.Exception`, bao gồm cả Checked Exceptions (như `IOException`, `SQLException`).
- [ ] Chỉ khi phương thức ném ra các ngoại lệ liên quan đến lỗi kết nối cơ sở dữ liệu (`DataAccessException`).
- [ ] Bất kỳ ngoại lệ nào khiến HTTP Status code của Controller trả về dải 4xx hoặc 5xx.

> **Giải thích:** Quy ước mặc định của Spring Transaction: Chỉ rollback khi gặp `RuntimeException` hoặc `Error`. Đối với Checked Exception (kế thừa trực tiếp từ `Exception`), Spring coi đó là luồng nghiệp vụ dự đoán trước được và mặc định VẪN COMMIT transaction. Muốn rollback cả Checked Exception, bạn phải khai báo tường minh: `@Transactional(rollbackFor = Exception.class)`.

### Câu 4: Bean Scope mặc định của một Spring Bean là gì và yêu cầu gì về mặt thiết kế để đảm bảo an toàn đa luồng (Thread-Safety)?
- [x] Scope mặc định là `Singleton` (duy nhất 1 instance trên Spring IoC container); bean phải được thiết kế dạng stateless (không lưu trạng thái người dùng trong biến instance) để tránh race condition khi nhiều luồng đồng thời truy cập.
- [ ] Scope mặc định là `Prototype` (tạo mới mỗi khi inject); bean có thể lưu trữ trạng thái người dùng tùy ý mà không sợ xung đột giữa các request.
- [ ] Scope mặc định là `Request` (gắn liền với vòng đời HTTP request); mỗi request sở hữu một bản sao bean độc lập trong suốt phiên làm việc.
- [ ] Scope mặc định là `Session` (gắn với HTTP Session); bean tự động đồng bộ hóa trạng thái đa luồng thông qua cơ chế khóa ReentrantLock.

> **Giải thích:** Khác với mẫu thiết kế GoF Singleton (1 instance trên 1 ClassLoader), Spring Singleton là 1 instance trên mỗi Spring IoC Container. Do được chia sẻ giữa hàng ngàn request đồng thời từ thread pool của Tomcat, các Spring Service/Repository tuyệt đối không được lưu trạng thái người dùng vào biến thực thể (instance variable) của class.

### Câu 5: Điểm khác biệt căn bản về vị trí và khả năng can thiệp giữa Servlet `Filter` và Spring `HandlerInterceptor` là gì?
- [x] `Filter` nằm ở tầng Servlet Container ngoài cùng (xử lý trước khi request vào `DispatcherServlet`); còn `Interceptor` nằm bên trong Spring MVC context, có thể truy cập thông tin controller method và tận dụng đầy đủ DI của Spring.
- [ ] `Filter` chỉ dùng để ghi log request đến, còn `Interceptor` là thành phần duy nhất được phép kiểm tra mã xác thực JWT của người dùng.
- [ ] `Filter` chỉ can thiệp vào request của phương thức GET, còn `Interceptor` chỉ can thiệp vào request của phương thức POST và PUT.
- [ ] `Filter` thực thi bất đồng bộ trên luồng riêng, trong khi `Interceptor` bắt buộc phải thực thi đồng bộ trên luồng chính.

> **Giải thích:** Luồng đi của một request: `Client -> Filter -> DispatcherServlet -> Interceptor -> Controller`. Do đó `Filter` thích hợp xử lý các tác vụ mức giao thức cấp thấp (CORS, gzip, mã hóa request, xác thực JWT thô). Còn `Interceptor` thích hợp xử lý kiểm tra phân quyền chi tiết (RBAC), kiểm tra metadata annotation trên controller method, hoặc ghi log hiệu năng method execution.

### Câu 6: Trong vòng đời khởi tạo của một Spring Bean (Bean Lifecycle), thứ tự thực thi chuẩn xác nào sau đây là đúng?
- [x] 1) Constructor (Khởi tạo instance) -> 2) Gán dependencies (`@Autowired`) -> 3) Các Aware Callbacks -> 4) `BeanPostProcessor.postProcessBeforeInitialization` -> 5) `@PostConstruct` -> 6) `BeanPostProcessor.postProcessAfterInitialization` (tạo Proxy AOP).
- [ ] 1) `@PostConstruct` -> 2) Constructor -> 3) Gán dependencies -> 4) Tạo Proxy AOP -> 5) Các Aware Callbacks.
- [ ] 1) Tạo Proxy AOP -> 2) Constructor -> 3) `BeanPostProcessor` -> 4) Gán dependencies -> 5) `@PostConstruct`.
- [ ] 1) Constructor -> 2) `@PostConstruct` -> 3) Gán dependencies -> 4) Aware Callbacks -> 5) `BeanPostProcessor`.

> **Giải thích:** Vòng đời Spring Bean: 1) Gọi Constructor để tạo instance; 2) Gán các thuộc tính (`@Autowired`); 3) Gọi các callback Aware; 4) `BeanPostProcessor.beforeInitialization`; 5) Gọi hàm khởi tạo nghiệp vụ (`@PostConstruct` của JSR-250); 6) `BeanPostProcessor.afterInitialization` (đây là nơi Spring AOP bọc Proxy quanh bean).

### Câu 7: Điểm khác biệt quan trọng trong mục đích sử dụng giữa `@Component` và `@Bean` là gì?
- [x] `@Component` đánh dấu ở cấp độ Class để cơ chế Component Scanning tự động phát hiện mã nguồn nội bộ; còn `@Bean` khai báo trên phương thức cấu hình (trong class `@Configuration`), thường dùng để khởi tạo và cấu hình các class từ thư viện bên ngoài mà ta không có mã nguồn.
- [ ] `@Component` chỉ tạo ra các bean có scope Prototype, trong khi `@Bean` bắt buộc phải tạo ra các bean có scope Singleton.
- [ ] `@Component` bắt buộc phải kế thừa từ một interface, trong khi `@Bean` chỉ dùng được cho các abstract class.
- [ ] `@Component` không hỗ trợ việc inject các giá trị cấu hình từ file `application.properties`, còn `@Bean` thì có hỗ trợ.

> **Giải thích:** Nếu bạn viết một class mới trong dự án -> dùng `@Service`, `@Repository`, `@Component`. Nếu bạn dùng thư viện ngoài (ví dụ `ObjectMapper` của Jackson, `RestTemplate`, `ModelMapper`) mà bạn không thể thêm `@Component` vào class của họ -> bạn tạo một class `@Configuration` và viết hàm có `@Bean` để trả về instance đã được cấu hình.

### Câu 8: Thuộc tính `proxyBeanMethods = true` (mặc định) trong annotation `@Configuration` có ý nghĩa kỹ thuật gì?
- [x] Spring dùng CGLIB để tạo Proxy bọc class cấu hình, đảm bảo rằng việc gọi trực tiếp các method `@Bean` nội bộ trong cùng class sẽ trả về cùng một instance Singleton từ Spring Context thay vì tạo mới.
- [ ] Spring sẽ tự động chuyển đổi tất cả các phương thức trong class cấu hình thành các API endpoint RESTful.
- [ ] Spring bắt buộc tất cả các bean được định nghĩa trong class phải triển khai interface `Serializable`.
- [ ] Spring sẽ tạo một connection pool riêng biệt cho class cấu hình để tối ưu hóa việc truy vấn database.

> **Giải thích:** Nếu bạn có `@Bean A()` và `@Bean B()` gọi `new B(A())`: Với `proxyBeanMethods = true`, Spring CGLIB chặn lời gọi `A()` để lấy bean Singleton có sẵn trong container. Nếu cấu hình `proxyBeanMethods = false` (Lite mode), mỗi lần gọi `A()` sẽ chạy mã Java thuần và tạo một object mới tinh, giúp Spring Boot khởi động nhanh hơn khi không cần dependency inter-bean.

### Câu 9: Trong Spring Data JPA, giải pháp nào sau đây giúp giải quyết triệt để vấn đề "N+1 Query" khi truy vấn thực thể có quan hệ một-nhiều?
- [x] Sử dụng mệnh đề `JOIN FETCH` trong JPQL/HQL hoặc khai báo annotation `@EntityGraph(attributePaths = {"..."})` để nạp dữ liệu cha và con trong một câu SQL JOIN duy nhất.
- [ ] Đổi cấu hình quan hệ từ `FetchType.LAZY` sang `FetchType.EAGER` trên trường quan hệ của Entity.
- [ ] Đặt annotation `@Transactional(readOnly = true)` trên phương thức repository để ép JPA cache lại toàn bộ kết quả.
- [ ] Bật cờ cấu hình `spring.jpa.open-in-view=true` trong file `application.properties`.

> **Giải thích:** Chuyển sang `FetchType.EAGER` KHÔNG giải quyết được N+1 Query mà thậm chí còn làm trầm trọng hơn (JPA vẫn sinh N query phụ khi chạy `findAll()`). Giải pháp tối ưu: Dùng `JOIN FETCH` hoặc `@EntityGraph` để ép JPA sinh ra duy nhất một câu lệnh SQL JOIN ở tầng database, nạp toàn bộ danh sách cha và con trong 1 lần round-trip duy nhất.

### Câu 10: Điều kiện tiên quyết để annotation `@Async` trong Spring Boot có thể thực thi phương thức bất đồng bộ trên một luồng nền độc lập là gì?
- [x] Phải có `@EnableAsync` trên lớp cấu hình, phương thức phải có phạm vi truy cập `public`, và lời gọi phương thức phải xuất phát từ bên ngoài Bean (không gọi nội bộ self-invocation).
- [ ] Phương thức bắt buộc phải trả về kiểu `CompletableFuture<Void>` và không được nhận bất kỳ tham số đầu vào nào.
- [ ] Lớp chứa phương thức `@Async` bắt buộc phải triển khai interface `Runnable` hoặc `Callable`.
- [ ] Ứng dụng phải được cấu hình chạy trên máy chủ phân tán Kubernetes với tối thiểu 2 Pods hoạt động.

> **Giải thích:** Tương tự `@Transactional`, `@Async` là tính năng AOP. Nếu phương thức gọi và phương thức `@Async` nằm trong cùng một class (`this.doAsync()`), lời gọi bỏ qua Proxy và method sẽ chạy ĐỒNG BỘ trên luồng chính của request! Luôn cần cấu hình một `ThreadPoolTaskExecutor` tường minh với `corePoolSize`, `maxPoolSize` thay vì dùng executor mặc định `SimpleAsyncTaskExecutor` (vốn tạo luồng mới liên tục không giới hạn).

### Câu 11: Từ phiên bản Spring Boot 2.6 trở đi, cách ứng xử mặc định của hệ thống khi phát hiện lỗi Phụ thuộc vòng tròn (Circular Dependency giữa Bean A và Bean B) là gì?
- [x] Bị cấm theo mặc định; Spring Boot sẽ ném ngoại lệ `BeanCurrentlyInCreationException` và dừng khởi động ứng dụng để buộc lập trình viên phải tái cấu trúc (refactor) lại thiết kế.
- [ ] Tự động giải quyết bằng cách inject giá trị `null` vào bean được tạo sau và cập nhật lại tham chiếu sau khi hoàn tất.
- [ ] Tự động chuyển đổi một trong hai bean sang scope Prototype để tránh việc khóa vòng lặp trong container.
- [ ] Tự động trì hoãn việc inject bean thứ hai cho đến khi có request đầu tiên gọi tới ứng dụng lúc runtime.

> **Giải thích:** Phụ thuộc vòng tròn là "mùi hôi của code" (Code Smell), thể hiện việc vi phạm nguyên lý Single Responsibility (SRP). Dù có thể chữa cháy tạm thời bằng `spring.main.allow-circular-references=true` hoặc `@Lazy`, giải pháp kiến trúc đúng đắn là tách phần phụ thuộc chung ra một Service thứ ba (Service C) hoặc dùng Event-Driven (Spring ApplicationEvent).

### Câu 12: Trong Spring Boot 3.0+, cơ chế Auto-Configuration tự động nạp danh sách các lớp cấu hình thông qua tệp tin nào?
- [x] `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`
- [ ] `META-INF/spring.factories`
- [ ] `META-INF/spring-configuration-metadata.json`
- [ ] `META-INF/additional-spring-configuration-metadata.json`

> **Giải thích:** Ở Spring Boot 1 và 2, auto-configuration được đăng ký trong `META-INF/spring.factories`. Từ Spring Boot 2.7 và chính thức chuẩn hóa ở Spring Boot 3.0, Spring chuyển sang file định dạng danh sách sạch sẽ: `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`, mỗi dòng là một full class name của AutoConfiguration.

### Câu 13: Cặp annotation `@RestControllerAdvice` và `@ExceptionHandler` giải quyết bài toán gì trong kiến trúc RESTful API?
- [x] Xử lý ngoại lệ tập trung toàn cục (Global Exception Handling), chặn các exception ném ra từ Controller và chuyển đổi thành cấu trúc phản hồi JSON chuẩn (Problem Details) kèm HTTP status tương ứng.
- [ ] Tự động kiểm tra quyền hạn truy cập của người dùng (Authorization) trước khi request đi vào Controller method.
- [ ] Ghi đè toàn bộ tham số của HTTP Request Header trước khi chuyển tiếp sang tầng Service xử lý nghiệp vụ.
- [ ] Tự động ghi lại log thời gian thực thi của tất cả các câu lệnh SQL được sinh ra bởi Hibernate.

> **Giải thích:** Thay vì đặt các khối `try-catch` lặp đi lặp lại trong từng Controller endpoint, `@RestControllerAdvice` hoạt động như một interceptor toàn cục: Khi bất kỳ service hay controller nào `throw new NotFoundException(...)`, Spring tự động bắt ngoại lệ và trả về payload thống nhất: `{ "status": 404, "error": "Not Found", "message": "..." }`.

### Câu 14: Trong kiến trúc Spring Security, thành phần trung tâm nào chịu trách nhiệm điều phối toàn bộ chuỗi các bộ lọc bảo mật cho các request HTTP?
- [x] `SecurityFilterChain` kết hợp với `FilterChainProxy`, điều phối danh sách các filter tuần tự (CORS, CSRF, Authentication, Authorization).
- [ ] `AuthenticationManager` kết hợp với `UserDetailsService` để quét và bọc các Controller bằng Dynamic Proxy.
- [ ] `SecurityContextPersistenceFilter` kết hợp với `HttpSession` để lưu trữ mã băm mật khẩu người dùng trong bộ nhớ cache.
- [ ] `AccessDecisionManager` kết hợp với `MethodSecurityInterceptor` để chặn đứng các request không có chữ ký số.

> **Giải thích:** Spring Security cắm một Filter duy nhất tên là `DelegatingFilterProxy` vào Servlet Container. Filter này ủy quyền toàn bộ cho `FilterChainProxy` của Spring, bên trong quản lý một hoặc nhiều `SecurityFilterChain`. Mỗi request phải đi qua tuần tự từng filter để kiểm tra: CORS -> CSRF -> Giải mã JWT/Session -> Gán `Authentication` vào `SecurityContextHolder` -> Kiểm tra quyền (Authorization).

### Câu 15: Annotation `@Profile` trong Spring Boot cung cấp khả năng nào trong quản lý triển khai?
- [x] Cho phép kích hoạt có điều kiện một Bean hoặc một lớp `@Configuration` dựa trên môi trường hiện tại đang chạy (như `dev`, `test`, `prod`).
- [ ] Đo lường chi tiết thời gian thực thi và mức độ tiêu thụ RAM của các phương thức phục vụ mục đích tuning hiệu năng.
- [ ] Tự động phân chia người dùng thành các nhóm thử nghiệm A/B Testing dựa trên thông tin phiên đăng nhập.
- [ ] Giới hạn số lượng request tối đa mà một Controller có thể xử lý trong một đơn vị thời gian.

> **Giải thích:** `@Profile("dev")` giúp linh hoạt hóa hạ tầng: Môi trường dev dùng `@Profile("dev")` để inject Bean giả lập (MockPaymentService, H2 In-Memory DB); môi trường production dùng `@Profile("prod")` để inject Bean thật (StripePaymentService, PostgreSQL Cluster). Kích hoạt bằng tham số JVM `-Dspring.profiles.active=prod` hoặc biến môi trường `SPRING_PROFILES_ACTIVE`.

### Câu 16: Khi đặt `@Valid` (hoặc `@Validated`) trên tham số `@RequestBody` của Controller, hành vi xử lý của Spring khi dữ liệu không hợp lệ là gì?
- [x] Kích hoạt bộ kiểm tra JSR-380 (Hibernate Validator); nếu có lỗi vi phạm, Spring sẽ ném ngoại lệ `MethodArgumentNotValidException` và trả về HTTP 400 Bad Request.
- [ ] Tự động loại bỏ các trường dữ liệu vi phạm và tiếp tục thực thi phương thức với các trường dữ liệu hợp lệ còn lại.
- [ ] Tự động gán các giá trị mặc định cho các trường bị lỗi và chuyển tiếp request sang tầng Service mà không báo lỗi.
- [ ] Ném ra ngoại lệ `IllegalArgumentException` và ngay lập tức ngắt kết nối TCP của client đang gửi request.

> **Giải thích:** Validation tách rời logic kiểm tra tính đúng đắn của dữ liệu đầu vào ra khỏi business logic: Bạn chỉ cần khai báo trên DTO: `@NotBlank String username; @Email String email;`. Khi Controller nhận request có `@Valid @RequestBody UserDTO dto`, Spring kiểm tra tự động trước khi code trong method kịp chạy, đảm bảo dữ liệu luôn sạch và an toàn.

### Câu 17: Sự khác biệt bản chất giữa annotation `@Cacheable` và `@CachePut` trong Spring Cache là gì?
- [x] `@Cacheable` sẽ bỏ qua việc thực thi method nếu tìm thấy dữ liệu trong cache (Cache Hit); còn `@CachePut` luôn luôn thực thi method và cập nhật dữ liệu mới nhất vào cache.
- [ ] `@Cacheable` chỉ lưu trữ dữ liệu trong bộ nhớ cục bộ Heap, còn `@CachePut` bắt buộc phải lưu trữ trên Redis phân tán.
- [ ] `@Cacheable` dùng cho các thao tác ghi dữ liệu, trong khi `@CachePut` dùng cho các thao tác đọc dữ liệu.
- [ ] `@Cacheable` tự động xóa cache khi hết hạn TTL, còn `@CachePut` giữ cache vĩnh viễn không bao giờ hết hạn.

> **Giải thích:**
- `@Cacheable(value = "users", key = "#id")`: Dành cho hàm ĐỌC (`findUserById`). Nếu có trong cache thì trả về ngay; nếu chưa có thì mới chạy method rồi lưu vào cache.
- `@CachePut(value = "users", key = "#user.id")`: Dành cho hàm CẬP NHẬT (`updateUser`). Phương thức luôn chạy để update DB, sau đó lấy kết quả ghi đè vào cache để đảm bảo cache luôn đồng bộ.
- `@CacheEvict`: Dành cho hàm XÓA (`deleteUser`), loại bỏ key ra khỏi cache.

### Câu 18: Khi container phát hiện có từ hai Bean trở lên cùng triển khai một Interface tại điểm tiêm phụ thuộc `@Autowired`, Spring sẽ xử lý như thế nào nếu không có cấu hình bổ sung?
- [x] Ném ra ngoại lệ `NoUniqueBeanDefinitionException`; cần sử dụng `@Qualifier("beanName")` hoặc đặt `@Primary` trên Bean ưu tiên để chỉ định rõ ràng.
- [ ] Tự động chọn Bean nào có tên trùng khớp với tên interface để inject vào ứng dụng.
- [ ] Tự động khởi tạo một Bean rỗng (null object) để tránh làm gián đoạn tiến trình khởi động ứng dụng.
- [ ] Tự động gộp thuộc tính của cả hai Bean lại thành một đối tượng hợp nhất để phục vụ injection.

> **Giải thích:** Spring tiêm phụ thuộc ưu tiên theo Kiểu (by Type). Khi có 2 class cùng implement interface `PaymentGateway` (`PaypalGateway` và `StripeGateway`), Spring không biết chọn ai. Sử dụng `@Qualifier("stripeGateway")` giúp chỉ định tường minh đích danh bean cần inject; hoặc đặt `@Primary` trên bean mặc định được ưu tiên.

### Câu 19: Spring Boot Actuator mang lại giá trị cốt lõi nào cho việc vận hành ứng dụng trong môi trường Production?
- [x] Cung cấp các HTTP endpoint chuẩn hóa (như `/actuator/health`, `/actuator/metrics`, `/actuator/env`) giúp hệ thống giám sát (Prometheus, Kubernetes) theo dõi trạng thái sức khỏe và số liệu tài nguyên.
- [ ] Tự động biên dịch mã bytecode của ứng dụng sang mã máy AOT (Ahead-of-Time) để tối ưu hóa CPU lúc chạy.
- [ ] Tự động sao lưu định kỳ toàn bộ dữ liệu từ cơ sở dữ liệu quan hệ sang các tệp tin backup cục bộ.
- [ ] Tự động điều chỉnh kích thước của Thread Pool trong Tomcat dựa trên lưu lượng truy cập mạng theo thời gian thực.

> **Giải thích:** Actuator là module giám sát sẵn sàng cho Production (Production-ready features). Kubernetes sử dụng endpoint `/actuator/health/liveness` và `/actuator/health/readiness` để biết khi nào Pod đã sẵn sàng nhận traffic hoặc khi nào Pod bị treo để tự động restart.

### Câu 20: Bản chất của một "Spring Boot Starter" (như `spring-boot-starter-web`) trong hệ sinh thái Spring Boot là gì?
- [x] Là một bộ mô-đun phụ thuộc tổng hợp (Aggregated Dependency Descriptor) đóng gói sẵn các thư viện tương thích phiên bản và kích hoạt các cấu hình tự động (Auto-configuration) tương ứng.
- [ ] Là một trình thông dịch bytecode chạy độc lập thay thế cho Java Virtual Machine (JVM) thông thường.
- [ ] Là một máy chủ web độc lập được cài đặt trực tiếp vào hệ điều hành của máy chủ trước khi deploy ứng dụng.
- [ ] Là một tiện ích dòng lệnh dùng để tự động tạo khung mã nguồn (scaffolding) cho các entity và repository.

> **Giải thích:** Trước khi có Spring Boot, để làm ứng dụng web bạn phải tự khai báo hàng chục dependency trong `pom.xml`: Spring MVC, Jackson, Tomcat nhúng, Hibernate-validator, Logback... và tự giải quyết xung đột phiên bản. Với `spring-boot-starter-web`, bạn chỉ cần khai báo đúng 1 dependency duy nhất; nó tự kéo toàn bộ thư viện đồng bộ về và kích hoạt cấu hình DispatcherServlet sẵn sàng chạy.
