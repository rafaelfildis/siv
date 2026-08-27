import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";

export type PropsMunicipio = { cod_ibge: number; nome: string };
export type FeicaoMunicipio = Feature<Polygon | MultiPolygon, PropsMunicipio>;
export type MalhaBahia = FeatureCollection<Polygon | MultiPolygon, PropsMunicipio>;
