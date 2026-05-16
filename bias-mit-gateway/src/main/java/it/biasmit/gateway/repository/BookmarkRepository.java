package it.biasmit.gateway.repository;

import it.biasmit.gateway.model.Bookmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {
    // Estendendo JpaRepository abbiamo già pronti i metodi: .save(), .findAll(), .deleteById()
    Optional<Bookmark> findByDatasetAndModelNameAndCategoryAndExampleId(
        String dataset, String modelName, String category, Integer exampleId);
}
//Spring genera automaticamente il codice necessario per parlare con PostgreSQL ereditando da JpaRepository circa 30 metodi