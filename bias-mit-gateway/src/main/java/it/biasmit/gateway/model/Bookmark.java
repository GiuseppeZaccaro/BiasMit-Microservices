package it.biasmit.gateway.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "bookmarks", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"dataset", "model_name", "category", "example_id"})
})
@Data // Se usi Lombok, altrimenti genera Getter e Setter manualmente
public class Bookmark {

    @Id//chiave primaria
    @GeneratedValue(strategy = GenerationType.IDENTITY)//dice al db di gestire il numero ad ogni nuovo segnalibro
    private Long id;

    private String dataset;      // bbq o stereoset
    private String modelName;    // mistral
    private String category;
    private Integer exampleId;

    @Column(columnDefinition = "TEXT")
    private String promptText;   // Il testo della domanda originale

    @Column(columnDefinition = "TEXT")
    private String modelResponse; // La risposta specifica che vuoi salvare

    private String methodUsed;    // baseline, caa_block, ecc.
}