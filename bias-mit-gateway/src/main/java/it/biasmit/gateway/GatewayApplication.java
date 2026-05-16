package it.biasmit.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class GatewayApplication {
    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }
    //runnando la classe viene avviato un server web interno, creati e collegati i componenti e verifica che PostgreSQL sia raggiungibile
}