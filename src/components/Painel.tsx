"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import { construirModelo, type LinhaMunicipio } from "@/lib/consultas";
import type { ChaveCamada } from "@/lib/camadas";
import type { MalhaBahia } from "@/lib/malha";
import type { Cargo, Dataset } from "@/lib/tipos";
import AppHeader from "./AppHeader";
import Kpis from "./Kpis";
import Diagnostico from "./Diagnostico";
import AtencaoOperacional from "./AtencaoOperacional";
import RankingTerritorial from "./RankingTerritorial";
import TabelaMunicipios from "./TabelaMunicipios";
import DrawerMunicipio from "./DrawerMunicipio";

// O mapa usa medidas do DOM e d3-zoom: só no cliente.
const Mapa = dynamic(() => import("./Mapa"), {
  ssr: false,
  loading: () => (
    <section className="card">
      <div className="card-head">
        <h2>Bahia · 417 municípios</h2>
      </div>
      <div
        className="flex items-center justify-center"
        style={{ height: "clamp(400px, calc(100vh - 268px), 600px)" }}
      >
        <div className="shimmer h-[290px] w-[230px] rounded-[var(--r-md)]" />
      </div>
    </section>
  ),
});

export default function Painel({
  dataset,
  malha,
}: {
  dataset: Dataset;
  malha: MalhaBahia;
}) {
  const [cargo, setCargo] = useState<Cargo>("estadual");
  const [camada, setCamada] = useState<ChaveCamada>("situacao");
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [linhaAberta, setLinhaAberta] = useState<LinhaMunicipio | null>(null);
  const [alvoZoom, setAlvoZoom] = useState<{ codIbge: number; token: number } | null>(
    null,
  );
  const [incluirSemEquipe, setIncluirSemEquipe] = useState(false);
  const [filtroTabela, setFiltroTabela] = useState("");
  const tabelaRef = useRef<HTMLDivElement>(null);
  const token = useRef(0);

  const modelo = useMemo(() => construirModelo(dataset, cargo), [dataset, cargo]);

  const nomesDaMalha = useMemo(
    () => new Map(malha.features.map((f) => [f.properties.cod_ibge, f.properties.nome])),
    [malha],
  );

  const zoomPara = useCallback((codIbge: number) => {
    token.current += 1;
    setAlvoZoom({ codIbge, token: token.current });
  }, []);

  /** Abre o drawer para um código da malha, mesmo sem registro na base. */
  const abrirPorCodigo = useCallback(
    (codIbge: number | null) => {
      if (codIbge === null) {
        setSelecionado(null);
        setLinhaAberta(null);
        return;
      }
      setSelecionado(codIbge);
      const existente = modelo.porCodigo.get(codIbge);
      setLinhaAberta(
        existente ?? {
          codIbge,
          nome: nomesDaMalha.get(codIbge) ?? "Município",
          equipe: 0,
          respostas: 0,
          coberturaPontos: 0,
          faixa: {
            chave: "semequipe",
            min: 0,
            rotulo: "Sem equipe identificada",
            cor: "var(--nodata)",
          },
          rotuloCobertura: "Sem cobertura",
          intencoes: [],
          suprimido: false,
          foraDaMalha: false,
          ultimaResposta: null,
        },
      );
    },
    [modelo, nomesDaMalha],
  );

  const abrirLinha = useCallback((l: LinhaMunicipio) => {
    setLinhaAberta(l);
    if (l.codIbge !== null) setSelecionado(l.codIbge);
  }, []);

  const localizar = useCallback(
    (l: LinhaMunicipio) => {
      if (l.codIbge === null || l.foraDaMalha) return;
      zoomPara(l.codIbge);
      abrirLinha(l);
    },
    [zoomPara, abrirLinha],
  );

  const rolarAteTabela = () =>
    tabelaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <AppHeader
        cargo={cargo}
        aoTrocarCargo={(c) => {
          setCargo(c);
          setLinhaAberta(null);
          setSelecionado(null);
        }}
        malha={malha}
        aoEscolherMunicipio={(cod) => {
          zoomPara(cod);
          abrirPorCodigo(cod);
        }}
      />

      <main className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-3 pb-12">
        <Kpis modelo={modelo} />

        {/*
          No mobile a coluna lateral vira `display: contents`, para que os seus
          dois cartões entrem na ordenação do pai e a leitura fique
          KPIs -> Diagnóstico -> Mapa -> Atenção operacional (handoff, §responsividade).
        */}
        <div className="flex flex-col items-start gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_372px]">
          <div className="order-2 w-full lg:order-1 lg:h-full">
            <Mapa
              malha={malha}
              modelo={modelo}
              camada={camada}
              aoTrocarCamada={setCamada}
              selecionado={selecionado}
              aoSelecionar={abrirPorCodigo}
              alvoZoom={alvoZoom}
            />
          </div>
          <div className="contents lg:order-2 lg:flex lg:flex-col lg:gap-3">
            <div className="order-1 w-full lg:order-none">
              <Diagnostico modelo={modelo} />
            </div>
            <div className="order-3 w-full lg:order-none">
              <AtencaoOperacional modelo={modelo} aoAbrir={localizar} />
            </div>
          </div>
        </div>

        <RankingTerritorial
          modelo={modelo}
          aoLocalizar={localizar}
          aoVerTodos={() => {
            setIncluirSemEquipe(true);
            rolarAteTabela();
          }}
        />

        <div ref={tabelaRef}>
          <TabelaMunicipios
            modelo={modelo}
            malha={malha}
            selecionado={selecionado}
            aoSelecionar={abrirLinha}
            incluirSemEquipe={incluirSemEquipe}
            setIncluirSemEquipe={setIncluirSemEquipe}
            filtro={filtroTabela}
            setFiltro={setFiltroTabela}
          />
        </div>
      </main>

      <DrawerMunicipio
        linha={linhaAberta}
        modelo={modelo}
        aoFechar={() => setLinhaAberta(null)}
        aoVerNaTabela={(l) => {
          setFiltroTabela(l.nome);
          setIncluirSemEquipe(true);
          setLinhaAberta(null);
          rolarAteTabela();
        }}
        aoLocalizar={(l) => l.codIbge !== null && zoomPara(l.codIbge)}
      />
    </>
  );
}
