-- As regras também ficam no banco para proteger gravações externas à API.
ALTER TABLE "HistoricoPosicao" ADD CONSTRAINT "posicao_um_recurso"
CHECK (("equipamentoId" IS NOT NULL)::integer + ("agenteId" IS NOT NULL)::integer = 1);

ALTER TABLE "HistoricoPosicao" ADD CONSTRAINT "posicao_coordenadas_validas"
CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180);

ALTER TABLE "Equipamento" ADD CONSTRAINT "equipamento_coordenadas_validas"
CHECK ((latitude IS NULL AND longitude IS NULL) OR
       (latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180));

ALTER TABLE "Equipamento" ADD CONSTRAINT "base_coordenadas_validas"
CHECK (("baseLatitude" IS NULL AND "baseLongitude" IS NULL) OR
       ("baseLatitude" IS NOT NULL AND "baseLongitude" IS NOT NULL AND "baseLatitude" BETWEEN -90 AND 90 AND "baseLongitude" BETWEEN -180 AND 180));

ALTER TABLE "Agente" ADD CONSTRAINT "agente_coordenadas_validas"
CHECK ((latitude IS NULL AND longitude IS NULL) OR
       (latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180));

ALTER TABLE "Ocorrencia" ADD CONSTRAINT "ocorrencia_coordenadas_validas"
CHECK ((latitude IS NULL AND longitude IS NULL) OR
       (latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180));

ALTER TABLE "Previsao" ADD CONSTRAINT "previsao_pontuacao_valida" CHECK (pontuacao BETWEEN 0 AND 100);
ALTER TABLE "Manutencao" ADD CONSTRAINT "manutencao_conclusao_coerente"
CHECK ((situacao = 'CONCLUIDA' AND "dataConclusao" IS NOT NULL) OR (situacao <> 'CONCLUIDA' AND "dataConclusao" IS NULL));
ALTER TABLE "Alerta" ADD CONSTRAINT "alerta_resolucao_coerente"
CHECK ((situacao = 'RESOLVIDO' AND "resolvidoEm" IS NOT NULL AND "chaveAtiva" IS NULL) OR (situacao <> 'RESOLVIDO' AND "resolvidoEm" IS NULL));
