package it.biasmit.gateway.repository;

import it.biasmit.gateway.model.Bookmark;//import della classe entità
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;//Optional è un contenitore che può essere pieno vuoto 
//forza il programmatore a gestire esplicitamente il caso in cui il valore non esiste
@Repository//indico a Spring che questo componente serve a comunicare con il db
public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {//eredita le funzionalità di JpaRepository
    // Estendendo JpaRepository abbiamo già pronti i metodi: .save(), .findAll(), .deleteById()
   //funzionalità di JPA che permette di costruire le query tramite il nome del metodo utilizzando parole chiave
    Optional<Bookmark> findByDatasetAndModelNameAndCategoryAndExampleId( //optional gestisce la possibilità che un valore sia presente o assente
        String dataset, String modelName, String category, Integer exampleId);
}
//Spring genera automaticamente il codice necessario per parlare con PostgreSQL ereditando da JpaRepository circa 30 metodi