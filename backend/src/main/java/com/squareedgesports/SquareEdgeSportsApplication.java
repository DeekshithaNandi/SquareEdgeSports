package com.squareedgesports;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@SpringBootApplication
@EnableAsync
@EnableScheduling
public class SquareEdgeSportsApplication {

    // The business (and every stored booking date/time) operates in IST, but
    // the JVM's default timezone otherwise falls back to whatever the host OS
    // uses - Windows dev machines here happen to already be IST, while Render
    // containers default to UTC. Every LocalDateTime.now() call in the app
    // (schedulers, createdAt/cancelledAt timestamps, refund-window math) reads
    // that default zone, so leaving it unset silently shifts all of that logic
    // by the UTC/IST offset in production while looking correct locally.
    // spring.jackson.time-zone only affects JSON serialization, not this.
    static {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Kolkata"));
    }

    public static void main(String[] args) {
        SpringApplication.run(SquareEdgeSportsApplication.class, args);
    }
}
