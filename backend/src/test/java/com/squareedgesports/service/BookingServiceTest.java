package com.squareedgesports.service;

import com.squareedgesports.dto.BookingDto;
import com.squareedgesports.dto.CreateBookingRequest;
import com.squareedgesports.entity.*;
import com.squareedgesports.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock BookingRepository bookingRepo;
    @Mock UserRepository userRepo;
    @Mock PricingRuleRepository pricingRepo;
    @Mock PaymentRepository paymentRepo;
    @Mock CmsContentRepository cmsRepo;
    @Mock EmailService emailService;
    @Mock RazorpayService razorpayService;
    @Mock NotificationService notificationService;

    @InjectMocks BookingService bookingService;

    private User nonMemberUser;
    private User cricketLaneMemberUser;
    private User boxCricketMemberUser;
    private User pickleballMemberUser;

    @BeforeEach
    void setUp() {
        nonMemberUser = User.builder().id(1L).fullName("Alice Smith").email("alice@example.com")
                .cricketLaneMember(false).boxCricketMember(false).pickleballMember(false).build();

        cricketLaneMemberUser = User.builder().id(2L).fullName("Bob Jones").email("bob@example.com")
                .cricketLaneMember(true).boxCricketMember(false).pickleballMember(false).build();

        boxCricketMemberUser = User.builder().id(3L).fullName("Carol Lee").email("carol@example.com")
                .cricketLaneMember(false).boxCricketMember(true).pickleballMember(false).build();

        pickleballMemberUser = User.builder().id(4L).fullName("Dave Chen").email("dave@example.com")
                .cricketLaneMember(false).boxCricketMember(false).pickleballMember(true).build();
    }

    // ─── Helper builders ───────────────────────────────────────────────────────

    private CreateBookingRequest req(String type, String start) {
        CreateBookingRequest r = new CreateBookingRequest();
        r.setBookingType(type);
        r.setStartTime(start);
        r.setBookingDate(LocalDate.now().plusDays(1));
        return r;
    }

    private PricingRule rule(String key, double price) {
        return PricingRule.builder().ruleKey(key).price(BigDecimal.valueOf(price)).build();
    }

    private Booking savedBooking(User user, String type, LocalDate date, LocalTime start, BigDecimal amount) {
        return Booking.builder()
                .id(10L).user(user).bookingType(type)
                .bookingDate(date).startTime(start).endTime(start.plusMinutes(55))
                .amountPaid(amount).paymentStatus("PENDING")
                .status(Booking.BookingStatus.CONFIRMED).build();
    }

    private void mockSave(Booking returnedBooking) {
        when(bookingRepo.save(any())).thenReturn(returnedBooking);
        when(paymentRepo.save(any())).thenReturn(new Payment());
    }

    // ─── create() ─────────────────────────────────────────────────────────────

    @Test
    void create_userNotFound_throwsRuntimeException() {
        when(userRepo.findById(99L)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> bookingService.create(99L, req("CRICKET_LANE", "09:00")));
    }

    @Test
    void create_nullStartTime_throwsIllegalArgumentException() {
        when(userRepo.findById(1L)).thenReturn(Optional.of(nonMemberUser));
        CreateBookingRequest r = req("CRICKET_LANE", null);
        r.setStartTime(null);
        assertThrows(IllegalArgumentException.class, () -> bookingService.create(1L, r));
    }

    @Test
    void create_blankStartTime_throwsIllegalArgumentException() {
        when(userRepo.findById(1L)).thenReturn(Optional.of(nonMemberUser));
        CreateBookingRequest r = req("CRICKET_LANE", "");
        assertThrows(IllegalArgumentException.class, () -> bookingService.create(1L, r));
    }

    @Test
    void create_invalidStartTimeFormat_throwsIllegalArgumentException() {
        when(userRepo.findById(1L)).thenReturn(Optional.of(nonMemberUser));
        assertThrows(IllegalArgumentException.class, () -> bookingService.create(1L, req("CRICKET_LANE", "9am")));
    }

    @Test
    void create_nonMember_cricketLane_usesStandardPrice() {
        LocalDate date = LocalDate.now().plusDays(1);
        when(userRepo.findById(1L)).thenReturn(Optional.of(nonMemberUser));
        when(pricingRepo.findByRuleKey("CRICKET_LANE")).thenReturn(Optional.of(rule("CRICKET_LANE", 500)));
        when(cmsRepo.findByActiveOrderBySortOrderAsc(true)).thenReturn(Collections.emptyList());
        Booking b = savedBooking(nonMemberUser, "CRICKET_LANE", date, LocalTime.of(9, 0), BigDecimal.valueOf(500));
        mockSave(b);

        BookingDto dto = bookingService.create(1L, req("CRICKET_LANE", "09:00"));

        assertThat(dto.getAmountPaid()).isEqualByComparingTo("500");
        assertThat(dto.isMemberDiscountApplied()).isFalse();
    }

    @Test
    void create_cricketLaneMember_usesMemberPrice() {
        LocalDate date = LocalDate.now().plusDays(1);
        when(userRepo.findById(2L)).thenReturn(Optional.of(cricketLaneMemberUser));
        when(pricingRepo.findByRuleKey("CRICKET_LANE_MEMBER")).thenReturn(Optional.of(rule("CRICKET_LANE_MEMBER", 400)));
        when(cmsRepo.findByActiveOrderBySortOrderAsc(true)).thenReturn(Collections.emptyList());
        Booking b = savedBooking(cricketLaneMemberUser, "CRICKET_LANE", date, LocalTime.of(9, 0), BigDecimal.valueOf(400));
        mockSave(b);

        BookingDto dto = bookingService.create(2L, req("CRICKET_LANE", "09:00"));

        assertThat(dto.getAmountPaid()).isEqualByComparingTo("400");
        assertThat(dto.isMemberDiscountApplied()).isTrue();
    }

    @Test
    void create_boxCricketMember_usesMemberPrice() {
        LocalDate date = LocalDate.now().plusDays(1);
        when(userRepo.findById(3L)).thenReturn(Optional.of(boxCricketMemberUser));
        when(pricingRepo.findByRuleKey("BOX_CRICKET_MEMBER")).thenReturn(Optional.of(rule("BOX_CRICKET_MEMBER", 350)));
        when(cmsRepo.findByActiveOrderBySortOrderAsc(true)).thenReturn(Collections.emptyList());
        Booking b = savedBooking(boxCricketMemberUser, "BOX_CRICKET", date, LocalTime.of(10, 0), BigDecimal.valueOf(350));
        mockSave(b);

        BookingDto dto = bookingService.create(3L, req("BOX_CRICKET", "10:00"));

        assertThat(dto.isMemberDiscountApplied()).isTrue();
    }

    @Test
    void create_pickleballMember_usesMemberPrice() {
        LocalDate date = LocalDate.now().plusDays(1);
        when(userRepo.findById(4L)).thenReturn(Optional.of(pickleballMemberUser));
        when(pricingRepo.findByRuleKey("PICKLEBALL_MEMBER")).thenReturn(Optional.of(rule("PICKLEBALL_MEMBER", 300)));
        when(cmsRepo.findByActiveOrderBySortOrderAsc(true)).thenReturn(Collections.emptyList());
        Booking b = savedBooking(pickleballMemberUser, "PICKLEBALL", date, LocalTime.of(11, 0), BigDecimal.valueOf(300));
        mockSave(b);

        BookingDto dto = bookingService.create(4L, req("PICKLEBALL", "11:00"));

        assertThat(dto.isMemberDiscountApplied()).isTrue();
    }

    @Test
    void create_noPricingRule_usesDefaultPrice500() {
        LocalDate date = LocalDate.now().plusDays(1);
        when(userRepo.findById(1L)).thenReturn(Optional.of(nonMemberUser));
        when(pricingRepo.findByRuleKey("CRICKET_LANE")).thenReturn(Optional.empty());
        when(cmsRepo.findByActiveOrderBySortOrderAsc(true)).thenReturn(Collections.emptyList());
        Booking b = savedBooking(nonMemberUser, "CRICKET_LANE", date, LocalTime.of(9, 0), BigDecimal.valueOf(500));
        mockSave(b);

        bookingService.create(1L, req("CRICKET_LANE", "09:00"));

        ArgumentCaptor<Booking> captor = ArgumentCaptor.forClass(Booking.class);
        verify(bookingRepo).save(captor.capture());
        assertThat(captor.getValue().getAmountPaid()).isEqualByComparingTo("500");
    }

    @Test
    void create_withCmsDiscount20Percent_appliesDiscount() {
        LocalDate date = LocalDate.now().plusDays(1);
        when(userRepo.findById(1L)).thenReturn(Optional.of(nonMemberUser));
        when(pricingRepo.findByRuleKey("CRICKET_LANE")).thenReturn(Optional.of(rule("CRICKET_LANE", 500)));

        CmsContent cms = CmsContent.builder()
                .active(true).discountPercent(20).dayRestriction("ALL_DAYS")
                .discountTimeFrom(null).discountTimeTo(null).build();
        when(cmsRepo.findByActiveOrderBySortOrderAsc(true)).thenReturn(List.of(cms));

        ArgumentCaptor<Booking> captor = ArgumentCaptor.forClass(Booking.class);
        when(bookingRepo.save(captor.capture())).thenAnswer(inv -> { Booking b = inv.getArgument(0); b.setId(1L); return b; });
        when(paymentRepo.save(any())).thenReturn(new Payment());

        bookingService.create(1L, req("CRICKET_LANE", "09:00"));

        // 500 * (1 - 0.20) = 400.00
        assertThat(captor.getValue().getAmountPaid()).isEqualByComparingTo("400.00");
    }

    @Test
    void create_cmsDiscountWeekdaysOnly_appliedOnWeekday() {
        // Find next Monday
        LocalDate monday = LocalDate.now();
        while (monday.getDayOfWeek() != DayOfWeek.MONDAY) monday = monday.plusDays(1);

        when(userRepo.findById(1L)).thenReturn(Optional.of(nonMemberUser));
        when(pricingRepo.findByRuleKey("CRICKET_LANE")).thenReturn(Optional.of(rule("CRICKET_LANE", 500)));

        CmsContent cms = CmsContent.builder()
                .active(true).discountPercent(10).dayRestriction("WEEKDAYS")
                .discountTimeFrom(null).discountTimeTo(null).build();
        when(cmsRepo.findByActiveOrderBySortOrderAsc(true)).thenReturn(List.of(cms));

        ArgumentCaptor<Booking> captor = ArgumentCaptor.forClass(Booking.class);
        when(bookingRepo.save(captor.capture())).thenAnswer(inv -> { Booking b = inv.getArgument(0); b.setId(1L); return b; });
        when(paymentRepo.save(any())).thenReturn(new Payment());

        CreateBookingRequest r = req("CRICKET_LANE", "09:00");
        r.setBookingDate(monday);
        bookingService.create(1L, r);

        // 500 * 0.90 = 450.00
        assertThat(captor.getValue().getAmountPaid()).isEqualByComparingTo("450.00");
    }

    @Test
    void create_cmsDiscountWeekdaysOnly_notAppliedOnWeekend() {
        // Find next Saturday
        LocalDate saturday = LocalDate.now();
        while (saturday.getDayOfWeek() != DayOfWeek.SATURDAY) saturday = saturday.plusDays(1);

        when(userRepo.findById(1L)).thenReturn(Optional.of(nonMemberUser));
        when(pricingRepo.findByRuleKey("CRICKET_LANE")).thenReturn(Optional.of(rule("CRICKET_LANE", 500)));

        CmsContent cms = CmsContent.builder()
                .active(true).discountPercent(10).dayRestriction("WEEKDAYS")
                .discountTimeFrom(null).discountTimeTo(null).build();
        when(cmsRepo.findByActiveOrderBySortOrderAsc(true)).thenReturn(List.of(cms));

        ArgumentCaptor<Booking> captor = ArgumentCaptor.forClass(Booking.class);
        when(bookingRepo.save(captor.capture())).thenAnswer(inv -> { Booking b = inv.getArgument(0); b.setId(1L); return b; });
        when(paymentRepo.save(any())).thenReturn(new Payment());

        CreateBookingRequest r = req("CRICKET_LANE", "09:00");
        r.setBookingDate(saturday);
        bookingService.create(1L, r);

        // No discount applied — weekend excluded by WEEKDAYS restriction
        assertThat(captor.getValue().getAmountPaid()).isEqualByComparingTo("500.00");
    }

    @Test
    void create_cmsDiscountWeekendsOnly_appliedOnSaturday() {
        LocalDate saturday = LocalDate.now();
        while (saturday.getDayOfWeek() != DayOfWeek.SATURDAY) saturday = saturday.plusDays(1);

        when(userRepo.findById(1L)).thenReturn(Optional.of(nonMemberUser));
        when(pricingRepo.findByRuleKey("CRICKET_LANE")).thenReturn(Optional.of(rule("CRICKET_LANE", 1000)));

        CmsContent cms = CmsContent.builder()
                .active(true).discountPercent(15).dayRestriction("WEEKENDS")
                .discountTimeFrom(null).discountTimeTo(null).build();
        when(cmsRepo.findByActiveOrderBySortOrderAsc(true)).thenReturn(List.of(cms));

        ArgumentCaptor<Booking> captor = ArgumentCaptor.forClass(Booking.class);
        when(bookingRepo.save(captor.capture())).thenAnswer(inv -> { Booking b = inv.getArgument(0); b.setId(1L); return b; });
        when(paymentRepo.save(any())).thenReturn(new Payment());

        CreateBookingRequest r = req("CRICKET_LANE", "09:00");
        r.setBookingDate(saturday);
        bookingService.create(1L, r);

        // 1000 * 0.85 = 850.00
        assertThat(captor.getValue().getAmountPaid()).isEqualByComparingTo("850.00");
    }

    @Test
    void create_cmsDiscountWithTimeRange_appliedWhenSlotWithinRange() {
        LocalDate date = LocalDate.now().plusDays(1);
        when(userRepo.findById(1L)).thenReturn(Optional.of(nonMemberUser));
        when(pricingRepo.findByRuleKey("CRICKET_LANE")).thenReturn(Optional.of(rule("CRICKET_LANE", 600)));

        CmsContent cms = CmsContent.builder()
                .active(true).discountPercent(25).dayRestriction("ALL_DAYS")
                .discountTimeFrom("08:00").discountTimeTo("12:00").build();
        when(cmsRepo.findByActiveOrderBySortOrderAsc(true)).thenReturn(List.of(cms));

        ArgumentCaptor<Booking> captor = ArgumentCaptor.forClass(Booking.class);
        when(bookingRepo.save(captor.capture())).thenAnswer(inv -> { Booking b = inv.getArgument(0); b.setId(1L); return b; });
        when(paymentRepo.save(any())).thenReturn(new Payment());

        CreateBookingRequest r = req("CRICKET_LANE", "10:00");
        r.setBookingDate(date);
        bookingService.create(1L, r);

        // 600 * 0.75 = 450.00
        assertThat(captor.getValue().getAmountPaid()).isEqualByComparingTo("450.00");
    }

    @Test
    void create_cmsDiscountWithTimeRange_notAppliedOutsideRange() {
        LocalDate date = LocalDate.now().plusDays(1);
        when(userRepo.findById(1L)).thenReturn(Optional.of(nonMemberUser));
        when(pricingRepo.findByRuleKey("CRICKET_LANE")).thenReturn(Optional.of(rule("CRICKET_LANE", 600)));

        CmsContent cms = CmsContent.builder()
                .active(true).discountPercent(25).dayRestriction("ALL_DAYS")
                .discountTimeFrom("08:00").discountTimeTo("12:00").build();
        when(cmsRepo.findByActiveOrderBySortOrderAsc(true)).thenReturn(List.of(cms));

        ArgumentCaptor<Booking> captor = ArgumentCaptor.forClass(Booking.class);
        when(bookingRepo.save(captor.capture())).thenAnswer(inv -> { Booking b = inv.getArgument(0); b.setId(1L); return b; });
        when(paymentRepo.save(any())).thenReturn(new Payment());

        CreateBookingRequest r = req("CRICKET_LANE", "14:00");
        r.setBookingDate(date);
        bookingService.create(1L, r);

        // 14:00 is outside 08:00–12:00 — no discount
        assertThat(captor.getValue().getAmountPaid()).isEqualByComparingTo("600.00");
    }

    @Test
    void create_multipleCmsDiscounts_usesBestDiscount() {
        LocalDate date = LocalDate.now().plusDays(1);
        when(userRepo.findById(1L)).thenReturn(Optional.of(nonMemberUser));
        when(pricingRepo.findByRuleKey("CRICKET_LANE")).thenReturn(Optional.of(rule("CRICKET_LANE", 1000)));

        CmsContent cms1 = CmsContent.builder().active(true).discountPercent(10).dayRestriction("ALL_DAYS").build();
        CmsContent cms2 = CmsContent.builder().active(true).discountPercent(30).dayRestriction("ALL_DAYS").build();
        CmsContent cms3 = CmsContent.builder().active(true).discountPercent(20).dayRestriction("ALL_DAYS").build();
        when(cmsRepo.findByActiveOrderBySortOrderAsc(true)).thenReturn(List.of(cms1, cms2, cms3));

        ArgumentCaptor<Booking> captor = ArgumentCaptor.forClass(Booking.class);
        when(bookingRepo.save(captor.capture())).thenAnswer(inv -> { Booking b = inv.getArgument(0); b.setId(1L); return b; });
        when(paymentRepo.save(any())).thenReturn(new Payment());

        bookingService.create(1L, req("CRICKET_LANE", "09:00"));

        // Best discount is 30% → 1000 * 0.70 = 700.00
        assertThat(captor.getValue().getAmountPaid()).isEqualByComparingTo("700.00");
    }

    @Test
    void create_cmsDiscount0Percent_noDiscount() {
        LocalDate date = LocalDate.now().plusDays(1);
        when(userRepo.findById(1L)).thenReturn(Optional.of(nonMemberUser));
        when(pricingRepo.findByRuleKey("CRICKET_LANE")).thenReturn(Optional.of(rule("CRICKET_LANE", 500)));

        CmsContent cms = CmsContent.builder().active(true).discountPercent(0).dayRestriction("ALL_DAYS").build();
        when(cmsRepo.findByActiveOrderBySortOrderAsc(true)).thenReturn(List.of(cms));

        ArgumentCaptor<Booking> captor = ArgumentCaptor.forClass(Booking.class);
        when(bookingRepo.save(captor.capture())).thenAnswer(inv -> { Booking b = inv.getArgument(0); b.setId(1L); return b; });
        when(paymentRepo.save(any())).thenReturn(new Payment());

        bookingService.create(1L, req("CRICKET_LANE", "09:00"));

        assertThat(captor.getValue().getAmountPaid()).isEqualByComparingTo("500.00");
    }

    @Test
    void create_endTimeIs55MinutesAfterStart() {
        LocalDate date = LocalDate.now().plusDays(1);
        when(userRepo.findById(1L)).thenReturn(Optional.of(nonMemberUser));
        when(pricingRepo.findByRuleKey("CRICKET_LANE")).thenReturn(Optional.of(rule("CRICKET_LANE", 500)));
        when(cmsRepo.findByActiveOrderBySortOrderAsc(true)).thenReturn(Collections.emptyList());

        ArgumentCaptor<Booking> captor = ArgumentCaptor.forClass(Booking.class);
        when(bookingRepo.save(captor.capture())).thenAnswer(inv -> { Booking b = inv.getArgument(0); b.setId(1L); return b; });
        when(paymentRepo.save(any())).thenReturn(new Payment());

        bookingService.create(1L, req("CRICKET_LANE", "09:00"));

        Booking saved = captor.getValue();
        assertThat(saved.getStartTime()).isEqualTo(LocalTime.of(9, 0));
        assertThat(saved.getEndTime()).isEqualTo(LocalTime.of(9, 55));
    }

    @Test
    void create_paymentReferenceStartsWithBK() {
        LocalDate date = LocalDate.now().plusDays(1);
        when(userRepo.findById(1L)).thenReturn(Optional.of(nonMemberUser));
        when(pricingRepo.findByRuleKey("CRICKET_LANE")).thenReturn(Optional.of(rule("CRICKET_LANE", 500)));
        when(cmsRepo.findByActiveOrderBySortOrderAsc(true)).thenReturn(Collections.emptyList());

        ArgumentCaptor<Booking> captor = ArgumentCaptor.forClass(Booking.class);
        when(bookingRepo.save(captor.capture())).thenAnswer(inv -> { Booking b = inv.getArgument(0); b.setId(1L); return b; });
        when(paymentRepo.save(any())).thenReturn(new Payment());

        bookingService.create(1L, req("CRICKET_LANE", "09:00"));

        assertThat(captor.getValue().getPaymentReference()).startsWith("BK-");
    }

    @Test
    void create_initialStatusIsAwaitingPayment() {
        LocalDate date = LocalDate.now().plusDays(1);
        when(userRepo.findById(1L)).thenReturn(Optional.of(nonMemberUser));
        when(pricingRepo.findByRuleKey("CRICKET_LANE")).thenReturn(Optional.of(rule("CRICKET_LANE", 500)));
        when(cmsRepo.findByActiveOrderBySortOrderAsc(true)).thenReturn(Collections.emptyList());

        ArgumentCaptor<Booking> captor = ArgumentCaptor.forClass(Booking.class);
        when(bookingRepo.save(captor.capture())).thenAnswer(inv -> { Booking b = inv.getArgument(0); b.setId(1L); return b; });
        when(paymentRepo.save(any())).thenReturn(new Payment());

        bookingService.create(1L, req("CRICKET_LANE", "09:00"));

        // Not CONFIRMED until payment actually succeeds - see confirmPayment_*.
        assertThat(captor.getValue().getStatus()).isEqualTo(Booking.BookingStatus.AWAITING_PAYMENT);
        assertThat(captor.getValue().getPaymentStatus()).isEqualTo("PENDING");
    }

    // ─── confirmPayment() ─────────────────────────────────────────────────────

    @Test
    void confirmPayment_bookingNotFound_throwsRuntimeException() {
        when(bookingRepo.findById(99L)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> bookingService.confirmPayment(99L, "pay_ref", "ONLINE"));
    }

    @Test
    void confirmPayment_setsPaymentStatusPaid() {
        Booking b = savedBooking(nonMemberUser, "CRICKET_LANE", LocalDate.now(), LocalTime.of(9, 0), BigDecimal.valueOf(500));
        when(bookingRepo.findById(10L)).thenReturn(Optional.of(b));
        when(bookingRepo.save(any())).thenReturn(b);
        when(paymentRepo.findByBookingId(10L)).thenReturn(Optional.empty());

        BookingDto dto = bookingService.confirmPayment(10L, "pay_xyz123", "RAZORPAY");

        assertThat(b.getPaymentStatus()).isEqualTo("PAID");
        assertThat(b.getPaymentReference()).isEqualTo("pay_xyz123");
    }

    @Test
    void confirmPayment_updatesPaymentRecord() {
        Booking b = savedBooking(nonMemberUser, "CRICKET_LANE", LocalDate.now(), LocalTime.of(9, 0), BigDecimal.valueOf(500));
        Payment p = Payment.builder().status(Payment.PaymentStatus.PENDING).build();
        when(bookingRepo.findById(10L)).thenReturn(Optional.of(b));
        when(bookingRepo.save(any())).thenReturn(b);
        when(paymentRepo.findByBookingId(10L)).thenReturn(Optional.of(p));
        when(paymentRepo.save(any())).thenReturn(p);

        bookingService.confirmPayment(10L, "pay_xyz", "ONLINE");

        assertThat(p.getStatus()).isEqualTo(Payment.PaymentStatus.PAID);
        assertThat(p.getGatewayPaymentId()).isEqualTo("pay_xyz");
        assertThat(p.getPaidAt()).isNotNull();
    }

    @Test
    void confirmPayment_awaitingPayment_promotesStatusToConfirmed() {
        Booking b = Booking.builder()
                .id(10L).user(nonMemberUser).bookingType("CRICKET_LANE")
                .bookingDate(LocalDate.now()).startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(9, 55))
                .amountPaid(BigDecimal.valueOf(500)).paymentStatus("PENDING")
                .status(Booking.BookingStatus.AWAITING_PAYMENT).build();
        when(bookingRepo.findById(10L)).thenReturn(Optional.of(b));
        when(bookingRepo.save(any())).thenReturn(b);
        when(paymentRepo.findByBookingId(10L)).thenReturn(Optional.empty());

        bookingService.confirmPayment(10L, "pay_xyz", "RAZORPAY");

        assertThat(b.getStatus()).isEqualTo(Booking.BookingStatus.CONFIRMED);
    }

    @Test
    void confirmPayment_nullPaymentRef_keepsExistingRef() {
        Booking b = savedBooking(nonMemberUser, "CRICKET_LANE", LocalDate.now(), LocalTime.of(9, 0), BigDecimal.valueOf(500));
        b.setPaymentReference("BK-existing");
        when(bookingRepo.findById(10L)).thenReturn(Optional.of(b));
        when(bookingRepo.save(any())).thenReturn(b);
        when(paymentRepo.findByBookingId(10L)).thenReturn(Optional.empty());

        bookingService.confirmPayment(10L, null, null);

        assertThat(b.getPaymentReference()).isEqualTo("BK-existing");
    }

    // ─── cancel() ─────────────────────────────────────────────────────────────

    @Test
    void cancel_bookingNotFound_throwsRuntimeException() {
        when(bookingRepo.findById(99L)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> bookingService.cancel(99L, 1L, "reason"));
    }

    @Test
    void cancel_unauthorizedUser_throwsRuntimeException() {
        Booking b = savedBooking(nonMemberUser, "CRICKET_LANE", LocalDate.now().plusDays(1), LocalTime.of(9, 0), BigDecimal.valueOf(500));
        // nonMemberUser.id = 1, attacker userId = 999
        when(bookingRepo.findById(10L)).thenReturn(Optional.of(b));
        assertThrows(RuntimeException.class, () -> bookingService.cancel(10L, 999L, "hack"));
    }

    @Test
    void cancel_authorizedUser_setsCancelledStatus() {
        Booking b = savedBooking(nonMemberUser, "CRICKET_LANE", LocalDate.now().plusDays(1), LocalTime.of(9, 0), BigDecimal.valueOf(500));
        when(bookingRepo.findById(10L)).thenReturn(Optional.of(b));
        when(bookingRepo.save(any())).thenReturn(b);

        BookingDto dto = bookingService.cancel(10L, 1L, "changed mind");

        assertThat(b.getStatus()).isEqualTo(Booking.BookingStatus.CANCELLED);
        assertThat(b.getCancellationReason()).isEqualTo("changed mind");
        assertThat(b.getCancelledAt()).isNotNull();
    }

    @Test
    void cancel_adminWithNullUserId_cancelsSuccessfully() {
        Booking b = savedBooking(nonMemberUser, "CRICKET_LANE", LocalDate.now().plusDays(1), LocalTime.of(9, 0), BigDecimal.valueOf(500));
        when(bookingRepo.findById(10L)).thenReturn(Optional.of(b));
        when(bookingRepo.save(any())).thenReturn(b);

        // Admin passes userId=null — bypasses ownership check
        bookingService.cancel(10L, null, "admin cancel");

        assertThat(b.getStatus()).isEqualTo(Booking.BookingStatus.CANCELLED);
    }

    // ─── refundByBookingId() — refund policy ──────────────────────────────────

    private Booking cancelledBookingWithTime(LocalDateTime sessionStart, LocalDateTime cancelledAt, BigDecimal amount) {
        Booking b = Booking.builder()
                .id(10L).user(nonMemberUser)
                .bookingType("CRICKET_LANE")
                .bookingDate(sessionStart.toLocalDate())
                .startTime(sessionStart.toLocalTime())
                .endTime(sessionStart.toLocalTime().plusMinutes(55))
                .amountPaid(amount)
                .paymentStatus("PAID")
                .status(Booking.BookingStatus.CANCELLED)
                .cancelledAt(cancelledAt)
                .build();
        return b;
    }

    @Test
    void refundByBookingId_cancelledMoreThan24HoursBefore_fullRefund() {
        LocalDateTime session   = LocalDateTime.now().plusHours(30);
        LocalDateTime cancelled = LocalDateTime.now(); // 30 hrs before session
        Booking b = cancelledBookingWithTime(session, cancelled, BigDecimal.valueOf(600));

        when(bookingRepo.findById(10L)).thenReturn(Optional.of(b));
        Payment p = Payment.builder().status(Payment.PaymentStatus.PAID)
                .gatewayPaymentId(null).build(); // offline payment
        when(paymentRepo.findByBookingId(10L)).thenReturn(Optional.of(p));
        when(bookingRepo.save(any())).thenReturn(b);
        when(paymentRepo.save(any())).thenReturn(p);

        Map<String, Object> result = bookingService.refundByBookingId(10L);

        assertThat(result.get("refundPolicy")).isEqualTo("FULL");
        assertThat((BigDecimal) result.get("refundAmount")).isEqualByComparingTo("600.00");
        assertThat(p.getStatus()).isEqualTo(Payment.PaymentStatus.REFUNDED);
    }

    @Test
    void refundByBookingId_cancelledBetween1And24HoursBefore_halfRefund() {
        LocalDateTime session   = LocalDateTime.now().plusHours(5);
        LocalDateTime cancelled = LocalDateTime.now(); // 5 hrs before session
        Booking b = cancelledBookingWithTime(session, cancelled, BigDecimal.valueOf(600));

        when(bookingRepo.findById(10L)).thenReturn(Optional.of(b));
        Payment p = Payment.builder().status(Payment.PaymentStatus.PAID)
                .gatewayPaymentId(null).build();
        when(paymentRepo.findByBookingId(10L)).thenReturn(Optional.of(p));
        when(bookingRepo.save(any())).thenReturn(b);
        when(paymentRepo.save(any())).thenReturn(p);

        Map<String, Object> result = bookingService.refundByBookingId(10L);

        assertThat(result.get("refundPolicy")).isEqualTo("HALF");
        assertThat((BigDecimal) result.get("refundAmount")).isEqualByComparingTo("300.00");
        assertThat(p.getStatus()).isEqualTo(Payment.PaymentStatus.PARTIAL_REFUND);
    }

    @Test
    void refundByBookingId_cancelledLessThan1HourBefore_noRefund() {
        LocalDateTime session   = LocalDateTime.now().plusMinutes(30);
        LocalDateTime cancelled = LocalDateTime.now();
        Booking b = cancelledBookingWithTime(session, cancelled, BigDecimal.valueOf(600));

        when(bookingRepo.findById(10L)).thenReturn(Optional.of(b));
        when(bookingRepo.save(any())).thenReturn(b);

        Map<String, Object> result = bookingService.refundByBookingId(10L);

        assertThat(result.get("refundPolicy")).isEqualTo("NONE");
        assertThat((BigDecimal) result.get("refundAmount")).isEqualByComparingTo("0");
        // No payment update needed — amount is zero
        verify(paymentRepo, never()).findByBookingId(any());
    }

    @Test
    void refundByBookingId_gatewayPaymentId_callsRazorpayRefund() {
        LocalDateTime session   = LocalDateTime.now().plusHours(30);
        LocalDateTime cancelled = LocalDateTime.now();
        Booking b = cancelledBookingWithTime(session, cancelled, BigDecimal.valueOf(800));

        when(bookingRepo.findById(10L)).thenReturn(Optional.of(b));
        Payment p = Payment.builder().status(Payment.PaymentStatus.PAID)
                .gatewayPaymentId("pay_abc123").build();
        when(paymentRepo.findByBookingId(10L)).thenReturn(Optional.of(p));
        when(bookingRepo.save(any())).thenReturn(b);
        when(paymentRepo.save(any())).thenReturn(p);
        when(razorpayService.refund(eq("pay_abc123"), any())).thenReturn(Map.of("refundId", "rfnd_1", "amount", 80000));

        Map<String, Object> result = bookingService.refundByBookingId(10L);

        assertThat(result.get("message")).isEqualTo("Refund processed");
        verify(razorpayService).refund(eq("pay_abc123"), eq(BigDecimal.valueOf(800)));
    }

    @Test
    void refundByBookingId_gatewayRefundFails_stillUpdatesDb() {
        LocalDateTime session   = LocalDateTime.now().plusHours(30);
        LocalDateTime cancelled = LocalDateTime.now();
        Booking b = cancelledBookingWithTime(session, cancelled, BigDecimal.valueOf(800));

        when(bookingRepo.findById(10L)).thenReturn(Optional.of(b));
        Payment p = Payment.builder().status(Payment.PaymentStatus.PAID)
                .gatewayPaymentId("pay_fail").build();
        when(paymentRepo.findByBookingId(10L)).thenReturn(Optional.of(p));
        when(bookingRepo.save(any())).thenReturn(b);
        when(paymentRepo.save(any())).thenReturn(p);
        when(razorpayService.refund(any(), any())).thenThrow(new RuntimeException("Gateway timeout"));

        Map<String, Object> result = bookingService.refundByBookingId(10L);

        assertThat(result.get("message")).isEqualTo("Refund recorded — gateway pending");
        assertThat(result).containsKey("gatewayNote");
        // DB should still be updated
        verify(paymentRepo).save(any());
        verify(bookingRepo).save(any());
    }

    @Test
    void refundByBookingId_bookingNotFound_throwsRuntimeException() {
        when(bookingRepo.findById(99L)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> bookingService.refundByBookingId(99L));
    }

    @Test
    void refundByBookingId_sendsRefundEmail() {
        LocalDateTime session   = LocalDateTime.now().plusHours(30);
        LocalDateTime cancelled = LocalDateTime.now();
        Booking b = cancelledBookingWithTime(session, cancelled, BigDecimal.valueOf(500));

        when(bookingRepo.findById(10L)).thenReturn(Optional.of(b));
        Payment p = Payment.builder().status(Payment.PaymentStatus.PAID).gatewayPaymentId(null).build();
        when(paymentRepo.findByBookingId(10L)).thenReturn(Optional.of(p));
        when(bookingRepo.save(any())).thenReturn(b);
        when(paymentRepo.save(any())).thenReturn(p);

        bookingService.refundByBookingId(10L);

        verify(emailService).sendRefundConfirmation(
                eq("alice@example.com"), eq("Alice Smith"),
                eq("CRICKET_LANE"), any(), any(), eq("FULL"));
    }

    // ─── assignCourt() ────────────────────────────────────────────────────────

    @Test
    void assignCourt_bookingNotFound_throwsRuntimeException() {
        when(bookingRepo.findById(99L)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> bookingService.assignCourt(99L, null, 2, null));
    }

    @Test
    void assignCourt_courtConflict_throwsRuntimeException() {
        Booking target = savedBooking(nonMemberUser, "PICKLEBALL",
                LocalDate.now().plusDays(1), LocalTime.of(9, 0), BigDecimal.valueOf(300));
        Booking clash = savedBooking(nonMemberUser, "PICKLEBALL",
                LocalDate.now().plusDays(1), LocalTime.of(9, 0), BigDecimal.valueOf(300));
        clash.setId(20L);

        when(bookingRepo.findById(10L)).thenReturn(Optional.of(target));
        when(bookingRepo.findCourtConflicts(any(), eq(2), any(), any(), eq(10L)))
                .thenReturn(List.of(clash));

        assertThrows(RuntimeException.class, () -> bookingService.assignCourt(10L, null, 2, null));
    }

    @Test
    void assignCourt_laneConflict_throwsRuntimeException() {
        Booking target = savedBooking(nonMemberUser, "CRICKET_LANE",
                LocalDate.now().plusDays(1), LocalTime.of(9, 0), BigDecimal.valueOf(500));
        Booking clash = savedBooking(nonMemberUser, "CRICKET_LANE",
                LocalDate.now().plusDays(1), LocalTime.of(9, 0), BigDecimal.valueOf(500));
        clash.setId(20L);

        when(bookingRepo.findById(10L)).thenReturn(Optional.of(target));
        when(bookingRepo.findLaneConflicts(any(), eq(3), any(), any(), eq(10L)))
                .thenReturn(List.of(clash));

        assertThrows(RuntimeException.class, () -> bookingService.assignCourt(10L, 3, null, null));
    }

    @Test
    void assignCourt_noConflict_setsCourtNumber() {
        Booking b = savedBooking(nonMemberUser, "PICKLEBALL",
                LocalDate.now().plusDays(1), LocalTime.of(9, 0), BigDecimal.valueOf(300));
        when(bookingRepo.findById(10L)).thenReturn(Optional.of(b));
        when(bookingRepo.findCourtConflicts(any(), eq(1), any(), any(), eq(10L))).thenReturn(Collections.emptyList());
        when(bookingRepo.save(any())).thenReturn(b);

        bookingService.assignCourt(10L, null, 1, null);

        assertThat(b.getCourtNumber()).isEqualTo(1);
        verify(emailService).sendCourtAssignment(any(), any(), any(), any(), any(), isNull(), eq(1), any());
    }

    @Test
    void assignCourt_noConflict_setsLaneNumber() {
        Booking b = savedBooking(nonMemberUser, "CRICKET_LANE",
                LocalDate.now().plusDays(1), LocalTime.of(9, 0), BigDecimal.valueOf(500));
        when(bookingRepo.findById(10L)).thenReturn(Optional.of(b));
        when(bookingRepo.findLaneConflicts(any(), eq(2), any(), any(), eq(10L))).thenReturn(Collections.emptyList());
        when(bookingRepo.save(any())).thenReturn(b);

        bookingService.assignCourt(10L, 2, null, "BOX_A");

        assertThat(b.getLaneNumber()).isEqualTo(2);
        assertThat(b.getBoxGroup()).isEqualTo("BOX_A");
    }

    // ─── getAvailableSlots() — slot count ────────────────────────────────────

    @Test
    void getAvailableSlots_generatesCorrectNumberOfSlots() {
        LocalDate date = LocalDate.now().plusDays(1);
        when(bookingRepo.findConflicting(any(), any(), any(), any())).thenReturn(Collections.emptyList());

        Map<String, Object> result = bookingService.getAvailableSlots(date, "PICKLEBALL", null);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> slots = (List<Map<String, Object>>) result.get("slots");
        // 07:00 → 21:00, one slot per 60 min, last slot ends 21:55 ≤ 22:00 → 15 slots
        assertThat(slots).hasSize(15);
    }

    @Test
    void getAvailableSlots_firstSlotStartsAt07() {
        LocalDate date = LocalDate.now().plusDays(1);
        when(bookingRepo.findConflicting(any(), any(), any(), any())).thenReturn(Collections.emptyList());

        Map<String, Object> result = bookingService.getAvailableSlots(date, "PICKLEBALL", null);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> slots = (List<Map<String, Object>>) result.get("slots");
        assertThat(slots.get(0).get("startTime")).isEqualTo("07:00");
        assertThat(slots.get(0).get("endTime")).isEqualTo("07:55");
    }

    @Test
    void getAvailableSlots_lastSlotStartsAt21() {
        LocalDate date = LocalDate.now().plusDays(1);
        when(bookingRepo.findConflicting(any(), any(), any(), any())).thenReturn(Collections.emptyList());

        Map<String, Object> result = bookingService.getAvailableSlots(date, "PICKLEBALL", null);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> slots = (List<Map<String, Object>>) result.get("slots");
        assertThat(slots.get(14).get("startTime")).isEqualTo("21:00");
        assertThat(slots.get(14).get("endTime")).isEqualTo("21:55");
    }

    @Test
    void getAvailableSlots_pickleball_allAvailableWhenNoConflicts() {
        LocalDate date = LocalDate.now().plusDays(1);
        when(bookingRepo.findConflicting(any(), any(), any(), any())).thenReturn(Collections.emptyList());

        Map<String, Object> result = bookingService.getAvailableSlots(date, "PICKLEBALL", null);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> slots = (List<Map<String, Object>>) result.get("slots");
        for (Map<String, Object> slot : slots) {
            assertThat((Boolean) slot.get("available")).isTrue();
            assertThat((Integer) slot.get("remaining")).isEqualTo(3);
        }
    }

    @Test
    void getAvailableSlots_pickleball_capacity3_unavailableWhenFull() {
        LocalDate date = LocalDate.now().plusDays(1);

        // Build 3 conflicting pickleball bookings for the same slot
        List<Booking> conflicts = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            Booking b = Booking.builder().bookingType("PICKLEBALL").build();
            conflicts.add(b);
        }
        when(bookingRepo.findConflicting(any(), any(), any(), any())).thenReturn(conflicts);

        Map<String, Object> result = bookingService.getAvailableSlots(date, "PICKLEBALL", null);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> slots = (List<Map<String, Object>>) result.get("slots");
        for (Map<String, Object> slot : slots) {
            assertThat((Boolean) slot.get("available")).isFalse();
            assertThat((Integer) slot.get("remaining")).isEqualTo(0);
        }
    }

    @Test
    void getAvailableSlots_cricketLane_capacity8_partiallyFilled() {
        LocalDate date = LocalDate.now().plusDays(1);

        // 2 CRICKET_LANE bookings — capacity is 8, so 6 remain
        List<Booking> conflicts = List.of(
                Booking.builder().bookingType("CRICKET_LANE").boxGroup("BOX_A").build(),
                Booking.builder().bookingType("CRICKET_LANE").boxGroup("BOX_A").build()
        );
        when(bookingRepo.findConflicting(any(), any(), any(), any())).thenReturn(conflicts);

        Map<String, Object> result = bookingService.getAvailableSlots(date, "CRICKET_LANE", "BOX_A");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> slots = (List<Map<String, Object>>) result.get("slots");
        assertThat((Boolean) slots.get(0).get("available")).isTrue();
        assertThat((Integer) slots.get(0).get("remaining")).isEqualTo(6);
    }

    @Test
    void getAvailableSlots_cricketLane_capacity8_unavailableWhenFull() {
        LocalDate date = LocalDate.now().plusDays(1);

        List<Booking> conflicts = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            conflicts.add(Booking.builder().bookingType("CRICKET_LANE").build());
        }
        when(bookingRepo.findConflicting(any(), any(), any(), any())).thenReturn(conflicts);

        Map<String, Object> result = bookingService.getAvailableSlots(date, "CRICKET_LANE", null);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> slots = (List<Map<String, Object>>) result.get("slots");
        for (Map<String, Object> slot : slots) {
            assertThat((Boolean) slot.get("available")).isFalse();
            assertThat((Integer) slot.get("remaining")).isEqualTo(0);
        }
    }

    @Test
    void getAvailableSlots_boxCricket_capacity2_unavailableWhenFull() {
        LocalDate date = LocalDate.now().plusDays(1);

        List<Booking> conflicts = List.of(
                Booking.builder().bookingType("BOX_CRICKET").build(),
                Booking.builder().bookingType("BOX_CRICKET").build()
        );
        when(bookingRepo.findConflicting(any(), any(), any(), any())).thenReturn(conflicts);

        Map<String, Object> result = bookingService.getAvailableSlots(date, "BOX_CRICKET", null);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> slots = (List<Map<String, Object>>) result.get("slots");
        for (Map<String, Object> slot : slots) {
            assertThat((Boolean) slot.get("available")).isFalse();
            assertThat((Integer) slot.get("remaining")).isEqualTo(0);
        }
    }

    @Test
    void getAvailableSlots_boxCricket_capacity2_availableWhenOneBooked() {
        LocalDate date = LocalDate.now().plusDays(1);

        List<Booking> conflicts = List.of(
                Booking.builder().bookingType("BOX_CRICKET").build()
        );
        when(bookingRepo.findConflicting(any(), any(), any(), any())).thenReturn(conflicts);

        Map<String, Object> result = bookingService.getAvailableSlots(date, "BOX_CRICKET", null);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> slots = (List<Map<String, Object>>) result.get("slots");
        assertThat((Boolean) slots.get(0).get("available")).isTrue();
        assertThat((Integer) slots.get(0).get("remaining")).isEqualTo(1);
    }

    // ─── createBatchRazorpayOrder() ───────────────────────────────────────────

    @Test
    void createBatchRazorpayOrder_sumsAmountsAndCallsRazorpay() {
        Booking b1 = savedBooking(nonMemberUser, "CRICKET_LANE", LocalDate.now(), LocalTime.of(9, 0), BigDecimal.valueOf(500));
        Booking b2 = savedBooking(nonMemberUser, "PICKLEBALL",   LocalDate.now(), LocalTime.of(10, 0), BigDecimal.valueOf(300));
        b2.setId(11L);

        when(bookingRepo.findById(10L)).thenReturn(Optional.of(b1));
        when(bookingRepo.findById(11L)).thenReturn(Optional.of(b2));
        when(razorpayService.createOrder(eq(BigDecimal.valueOf(800)), any()))
                .thenReturn(Map.of("orderId", "order_batch"));

        Map<String, Object> result = bookingService.createBatchRazorpayOrder(List.of(10L, 11L));

        verify(razorpayService).createOrder(eq(BigDecimal.valueOf(800)), contains("BATCH-10-"));
        assertThat(result.get("orderId")).isEqualTo("order_batch");
    }

    @Test
    void createBatchRazorpayOrder_bookingNotFound_throwsRuntimeException() {
        when(bookingRepo.findById(99L)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> bookingService.createBatchRazorpayOrder(List.of(99L)));
    }

    // ─── confirmBatchPayment() ────────────────────────────────────────────────

    @Test
    void confirmBatchPayment_confirmsEachBooking() {
        Booking b1 = savedBooking(nonMemberUser, "CRICKET_LANE", LocalDate.now(), LocalTime.of(9, 0), BigDecimal.valueOf(500));
        Booking b2 = savedBooking(nonMemberUser, "PICKLEBALL", LocalDate.now(), LocalTime.of(10, 0), BigDecimal.valueOf(300));
        b2.setId(11L);

        when(bookingRepo.findById(10L)).thenReturn(Optional.of(b1));
        when(bookingRepo.findById(11L)).thenReturn(Optional.of(b2));
        when(bookingRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(paymentRepo.findByBookingId(any())).thenReturn(Optional.empty());

        List<BookingDto> dtos = bookingService.confirmBatchPayment(List.of(10L, 11L), "pay_batch", "RAZORPAY");

        assertThat(dtos).hasSize(2);
        assertThat(b1.getPaymentStatus()).isEqualTo("PAID");
        assertThat(b2.getPaymentStatus()).isEqualTo("PAID");
    }

    // ─── toDto() — refund policy in DTO ──────────────────────────────────────

    @Test
    void toDto_activeBooking_refundPolicyIsNull() {
        Booking b = savedBooking(nonMemberUser, "PICKLEBALL", LocalDate.now().plusDays(2), LocalTime.of(9, 0), BigDecimal.valueOf(300));
        // status = CONFIRMED (not cancelled)

        BookingDto dto = bookingService.toDto(b);

        assertThat(dto.getRefundPolicy()).isNull();
        assertThat(dto.getRefundAmount()).isNull();
    }

    @Test
    void toDto_cancelledEarlyBooking_fullRefundPolicy() {
        // Cancelled 48 hrs before session
        LocalDate futureDate = LocalDate.now().plusDays(3);
        Booking b = Booking.builder()
                .id(10L).user(nonMemberUser).bookingType("PICKLEBALL")
                .bookingDate(futureDate).startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(9, 55))
                .amountPaid(BigDecimal.valueOf(300))
                .paymentStatus("PAID")
                .status(Booking.BookingStatus.CANCELLED)
                .cancelledAt(LocalDateTime.now()) // cancelled now, session in 3 days
                .build();

        BookingDto dto = bookingService.toDto(b);

        assertThat(dto.getRefundPolicy()).isEqualTo("FULL");
        assertThat(dto.getRefundAmount()).isEqualByComparingTo("300.00");
    }

    @Test
    void toDto_cancelledButNeverPaid_refundPolicyIsNull() {
        // e.g. auto-expired AWAITING_PAYMENT, or a desk DUE booking that was cancelled -
        // there's no real money to refund, so no refund badge should be shown.
        Booking b = Booking.builder()
                .id(11L).user(nonMemberUser).bookingType("PICKLEBALL")
                .bookingDate(LocalDate.now().plusDays(3)).startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(9, 55))
                .amountPaid(BigDecimal.valueOf(300))
                .paymentStatus("PENDING")
                .status(Booking.BookingStatus.CANCELLED)
                .cancelledAt(LocalDateTime.now())
                .build();

        BookingDto dto = bookingService.toDto(b);

        assertThat(dto.getRefundPolicy()).isNull();
        assertThat(dto.getRefundAmount()).isNull();
    }

    @Test
    void toDto_courtAssigned_courtAssignedFlagTrue() {
        Booking b = savedBooking(nonMemberUser, "PICKLEBALL", LocalDate.now().plusDays(1), LocalTime.of(9, 0), BigDecimal.valueOf(300));
        b.setCourtNumber(2);

        BookingDto dto = bookingService.toDto(b);

        assertThat(dto.isCourtAssigned()).isTrue();
    }

    @Test
    void toDto_noCourtAssigned_courtAssignedFlagFalse() {
        Booking b = savedBooking(nonMemberUser, "PICKLEBALL", LocalDate.now().plusDays(1), LocalTime.of(9, 0), BigDecimal.valueOf(300));

        BookingDto dto = bookingService.toDto(b);

        assertThat(dto.isCourtAssigned()).isFalse();
    }

    // ─── sendNoRefundNotification() ────────────────────────────────────────────

    @Test
    void sendNoRefundNotification_bookingNotFound_throwsRuntimeException() {
        when(bookingRepo.findById(99L)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> bookingService.sendNoRefundNotification(99L));
    }

    @Test
    void sendNoRefundNotification_sendsEmailToUser() {
        Booking b = savedBooking(nonMemberUser, "CRICKET_LANE",
                LocalDate.now().plusDays(1), LocalTime.of(9, 0), BigDecimal.valueOf(500));
        when(bookingRepo.findById(10L)).thenReturn(Optional.of(b));

        bookingService.sendNoRefundNotification(10L);

        verify(emailService).sendNoRefundNotification(
                eq("alice@example.com"), eq("Alice Smith"), eq("CRICKET_LANE"), any(), any());
    }
}
