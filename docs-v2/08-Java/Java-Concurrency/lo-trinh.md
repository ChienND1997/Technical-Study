# Lộ trình học Java Concurrency

Trang này gom **toàn bộ** nội dung về concurrency trong Learning Docs theo thứ tự học gợi ý: sách *Java Concurrency in Practice* làm trục chính, kèm các bài bổ sung cho Java hiện đại (Java 17/21), Spring Boot, database và phỏng vấn. Các bài ngoài mục này vẫn nằm ở chỗ cũ, chỉ được liên kết tới.

```mermaid
flowchart LR
    A["Bước 1<br/>Nền tảng"] --> B["Bước 2<br/>Thiết kế và công cụ"]
    B --> C["Bước 3<br/>Cấu trúc ứng dụng"]
    C --> D["Bước 4<br/>Nâng cao"]
    D --> E["Bước 5<br/>Hiện đại và thực chiến"]
    E --> F["Bước 6<br/>Ôn phỏng vấn"]
```

## Bước 1: Nền tảng (bắt buộc)

| Bài | Học được gì |
|---|---|
| [Java Core: Multithreading cơ bản và JMM](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-12-thread-co-ban.md) | Thread, lifecycle, `synchronized`, `volatile` ở mức nhập môn |
| [01. Giới thiệu concurrency](/go?p=08-Java%2FJava-Concurrency%2Feasy%2Flt-01-gioi-thieu-dong-thoi.md) | Vì sao dùng thread, ba nhóm rủi ro |
| [02. Thread Safety](/go?p=08-Java%2FJava-Concurrency%2Feasy%2Flt-02-thread-safety.md) | Atomicity, race condition, lock, invariant cần bảo vệ |
| [03. Chia sẻ object](/go?p=08-Java%2FJava-Concurrency%2Feasy%2Flt-03-chia-se-doi-tuong.md) | Visibility, publication, confinement, immutability |

## Bước 2: Thiết kế class và công cụ có sẵn

| Bài | Học được gì |
|---|---|
| [04. Thiết kế class thread-safe](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-04-thiet-ke-lop-thread-safe.md) | Instance confinement, delegation, tài liệu hóa chính sách đồng bộ |
| [05. Building blocks](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-05-building-blocks.md) | Concurrent collection, BlockingQueue, latch, semaphore, Memoizer |
| [Java Core: java.util.concurrent](/go?p=08-Java%2FJava-Core%2Fmedium%2Flt-13-java-util-concurrent.md) | Bản tóm tắt hiện đại: `ExecutorService`, `CompletableFuture`, `LongAdder` |

## Bước 3: Cấu trúc ứng dụng concurrent

| Bài | Học được gì |
|---|---|
| [06. Thực thi task](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-06-task-execution.md) | Executor framework, Callable, Future |
| [07. Hủy task và Shutdown](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-07-huy-va-shutdown.md) | Interruption, dừng dịch vụ, shutdown hook |
| [08. Thread pool trong thực tế](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-08-thread-pool.md) | Sizing, queue, saturation policy |
| [09. GUI và single-thread](/go?p=08-Java%2FJava-Concurrency%2Fmedium%2Flt-09-gui-single-thread.md) | Event thread, confinement ở mức kiến trúc |
| [Spring Boot: Scheduling và Async](/go?p=01-Spring-Boot%2Fmedium%2Flt-18-scheduling-async.md) | `@Async`, `@Scheduled` và executor trong Spring |

## Bước 4: Liveness, hiệu năng, nâng cao

| Bài | Học được gì |
|---|---|
| [10. Liveness hazards](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-10-liveness-hazards.md) | Deadlock, starvation, livelock |
| [11. Hiệu năng và Scalability](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-11-hieu-nang-scalability.md) | Amdahl, lock contention, striping |
| [12. Kiểm thử concurrency](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-12-kiem-thu-dong-thoi.md) | Test safety, liveness, hiệu năng |
| [13. Explicit locks](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-13-explicit-locks.md) | `ReentrantLock`, `ReadWriteLock`, fairness |
| [14. Synchronizer tùy biến và AQS](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-14-custom-synchronizer-aqs.md) | Condition queue, `AbstractQueuedSynchronizer` |
| [15. Atomic và nonblocking](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-15-atomic-nonblocking.md) | CAS, ABA, stack/queue không lock |
| [16. Java Memory Model](/go?p=08-Java%2FJava-Concurrency%2Fhard%2Flt-16-java-memory-model.md) | Happens-before, initialization safety |
| [Java Core: JMM chuyên sâu](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-17-java-memory-model-sau.md) | Bản bổ sung về JMM |

## Bước 5: Java hiện đại và thực chiến

| Bài | Học được gì |
|---|---|
| [Java Core: Virtual Threads và Structured Concurrency](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-20-virtual-threads-structured-concurrency.md) | Thay đổi lớn nhất từ Java 21 so với sách |
| [Java Core: ThreadLocal, Fork/Join, Reference](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-31-threadlocal-forkjoin-reference.md) | `ThreadLocal`, work stealing, parallel stream |
| [Java Core: Công cụ chẩn đoán JVM](/go?p=08-Java%2FJava-Core%2Fhard%2Flt-32-cong-cu-chan-doan-jvm.md) | Thread dump, JFR để tìm deadlock và nghẽn |
| [Spring Boot: Concurrency và Virtual Threads](/go?p=01-Spring-Boot%2Fhard%2Flt-22-concurrency-virtual-threads.md) | Áp dụng trong ứng dụng Spring |
| [Database: Transaction, Isolation và Lock](/go?p=02-Database%2Fmedium%2Flt-04-transaction-isolation-lock.md) | Concurrency ở tầng dữ liệu |
| [Spring Boot: Distributed lock và Idempotency](/go?p=01-Spring-Boot%2Fhard%2Flt-26-distributed-lock-idempotency.md) | Concurrency giữa nhiều process |

## Bước 6: Ôn phỏng vấn

- [Bộ câu hỏi: Collections, Concurrency và Java hiện đại](/go?p=07-Interview-QA%2FBackend%2Fmedium%2Fqa-03-collections-concurrency.md)
- [Bảng ôn phỏng vấn Java Core](/go?p=08-Java%2FJava-Core%2Fphong-van-tong-hop.md)

## Sách và Java hiện đại: đối chiếu nhanh

| Chủ đề trong sách | Cách làm hiện đại |
|---|---|
| Thread-per-task bị giới hạn bởi số thread | Virtual threads (Java 21): mỗi task một virtual thread, ít cần pool lớn |
| Ghép `Future` thủ công | `CompletableFuture`, structured concurrency |
| `ConcurrentHashMap` chia segment | Lock theo bucket và CAS từ Java 8; ý tưởng lock striping vẫn đúng |
| `Timer`, finalizer | `ScheduledExecutorService`, `Cleaner` |
| Counter `AtomicLong` dưới tranh chấp cao | `LongAdder` |
| Truy cập atomic bằng field updater | `VarHandle` |
| `ThreadLocal` | Cân nhắc lại với virtual thread; `ScopedValue` là hướng thay thế |
| `synchronized` trong code chặn lâu | Ở Java 21 có thể pin virtual thread, ưu tiên `ReentrantLock`; kiểm tra lại theo phiên bản bạn dùng |

