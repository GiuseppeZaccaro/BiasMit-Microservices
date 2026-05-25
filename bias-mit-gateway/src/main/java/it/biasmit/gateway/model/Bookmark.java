package it.biasmit.gateway.model;

import jakarta.persistence.*; //standard per connettere Java ai database relazionali
import lombok.Data;

@Entity //dice che è un'entità del db
@Table(name = "bookmarks", uniqueConstraints = { //imposta un vincolo di unicità che impedisce alle righe di essere uguali
    @UniqueConstraint(columnNames = {"dataset", "model_name", "category", "example_id"})
})
@Data // Se usi Lombok, altrimenti genera Getter e Setter manualmente
public class Bookmark {

    //annotazioni fornite da hibernate (provider di ORM)
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