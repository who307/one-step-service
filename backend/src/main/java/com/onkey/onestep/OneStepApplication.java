package com.onkey.onestep;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class OneStepApplication {

	public static void main(String[] args) {
		SpringApplication.run(OneStepApplication.class, args);
	}
}
