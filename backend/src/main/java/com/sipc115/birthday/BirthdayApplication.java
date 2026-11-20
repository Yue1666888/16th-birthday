package com.sipc115.birthday;

import org.apache.ibatis.annotations.Mapper;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan(basePackages = "com.sipc115.birthday", annotationClass = Mapper.class)
public class BirthdayApplication {
    public static void main(String[] args) {
        SpringApplication.run(BirthdayApplication.class, args);
    }
}
