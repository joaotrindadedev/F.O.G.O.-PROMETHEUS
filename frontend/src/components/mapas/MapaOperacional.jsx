import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import { renderToStaticMarkup } from 'react-dom/server';
import { Cctv, RadioTower, Car, UserRound, MapPin, LocateFixed } from 'lucide-react';
import { Link } from 'react-router-dom';
import { coordenadasValidas, dataHora, rotulo } from '../../utils/dados';
import { useOperacao } from '../../contexts/Operacao';
import { IndicadorSituacao, Seletor } from '../Comuns';
import { Button } from '../ui/button';
function AjustarVista({ pontos, recentralizar }) {
  const mapa = useMap();
  useEffect(() => {
    if (pontos.length)
      mapa.fitBounds(
        pontos.map((p) => [p.latitude, p.longitude]),
        { padding: [45, 45], maxZoom: 14 },
      );
  }, [mapa, recentralizar]);
  return null;
}
function criarMarcador(familia, situacao, agente) {
  const Icone = agente
    ? UserRound
    : familia === 'CAMERA'
      ? Cctv
      : familia === 'RADAR'
        ? RadioTower
        : familia === 'VEICULO'
          ? Car
          : MapPin;
  const classe = agente
    ? 'agent'
    : ['MAU_FUNCIONAMENTO', 'FURTADO'].includes(situacao)
      ? 'problem'
      : situacao === 'EM_MANUTENCAO'
        ? 'attention'
        : ['NAO_INSTALADO', 'DESATIVADO'].includes(situacao)
          ? 'inactive'
          : '';
  return L.divIcon({
    className: `marker ${classe}`,
    html: renderToStaticMarkup(<Icone aria-hidden="true" />),
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}
export function MapaOperacional({ equipamentos = [], agentes = [], expandido = false }) {
  const { catalogos } = useOperacao();
  const [tipo, setTipo] = useState('');
  const [situacao, setSituacao] = useState('');
  const [mostrarAgentes, setMostrarAgentes] = useState(true);
  const [centro, setCentro] = useState(0);
  const [erroMapa, setErroMapa] = useState(false);
  const recursos = useMemo(
    () =>
      [
        ...equipamentos.map((e) => ({ ...e, recurso: 'equipamentos' })),
        ...(mostrarAgentes ? agentes.map((a) => ({ ...a, recurso: 'agentes' })) : []),
      ].filter((p) => (!tipo || p.tipoId === tipo) && (!situacao || p.situacao === situacao)),
    [equipamentos, agentes, mostrarAgentes, tipo, situacao],
  );
  const pontos = recursos.filter(coordenadasValidas);
  const semLocalizacao = recursos.filter((p) => !coordenadasValidas(p));
  const chaveVista = JSON.stringify([tipo, situacao, mostrarAgentes, centro, pontos.length]);
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Mapa operacional</h2>
          <p>{pontos.length} recursos localizados • posições registradas</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Enquadrar recursos no mapa"
          onClick={() => setCentro((c) => c + 1)}
        >
          <LocateFixed size={18} />
        </Button>
      </div>
      <div className="filterbar !py-3">
        <Seletor
          rotulo="Tipo no mapa"
          value={tipo}
          onChange={setTipo}
          opcoes={catalogos.tipos}
          todos="Todos os equipamentos"
        />
        <Seletor
          rotulo="Situação no mapa"
          value={situacao}
          onChange={setSituacao}
          opcoes={[...new Set([...equipamentos, ...agentes].map((p) => p.situacao))]}
          todos="Todas as situações"
        />
        {agentes.length > 0 && (
          <label className="check-label">
            <input
              type="checkbox"
              checked={mostrarAgentes}
              onChange={(e) => setMostrarAgentes(e.target.checked)}
            />
            Agentes
          </label>
        )}
      </div>
      <div className="map-frame">
        <MapContainer
          center={[-14.2, -51.9]}
          zoom={4}
          className="map"
          style={expandido ? { height: 'min(65vh,750px)' } : undefined}
          scrollWheelZoom={expandido}
        >
          <TileLayer
            attribution={
              import.meta.env.VITE_MAPA_ATRIBUICAO ||
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }
            url={import.meta.env.VITE_MAPA_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'}
            eventHandlers={{ tileerror: () => setErroMapa(true) }}
          />
          <AjustarVista pontos={pontos} recentralizar={chaveVista} />
          <MarkerClusterGroup chunkedLoading maxClusterRadius={45} showCoverageOnHover={false}>
            {pontos.map((p) => (
              <Marker
                key={p.recurso + p.id}
                position={[p.latitude, p.longitude]}
                icon={criarMarcador(
                  catalogos.tipos.find((t) => t.id === p.tipoId)?.familia,
                  p.situacao,
                  p.recurso === 'agentes',
                )}
                title={`${p.nome || p.descricao} — ${rotulo(p.situacao)}`}
              >
                <Popup>
                  <strong>{p.nome || p.descricao}</strong>
                  <p>
                    {p.recurso === 'agentes'
                      ? 'Agente'
                      : catalogos.tipos.find((t) => t.id === p.tipoId)?.nome}
                  </p>
                  <IndicadorSituacao valor={p.situacao} />
                  <p>
                    Última posição conhecida:
                    <br />
                    {dataHora(p.ultimaPosicaoEm)}
                  </p>
                  <p>
                    {p.bairro} {p.cidade}
                  </p>
                  <Link className="text-link" to={'/' + p.recurso}>
                    Consultar cadastro
                  </Link>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>
      <div className="map-legend">
        <span>
          <i />
          Operacional
        </span>
        <span>
          <i className="amber" />
          Manutenção
        </span>
        <span>
          <i className="red" />
          Falha / furto
        </span>
        <span>
          <i className="blue" />
          Agente (situação no detalhe)
        </span>
      </div>
      {erroMapa && (
        <p className="notice !m-3" role="status">
          A base cartográfica não pôde ser carregada. As posições cadastradas continuam disponíveis
          nos marcadores.
        </p>
      )}
      {!pontos.length && (
        <p className="notice !m-3">
          Nenhum recurso com coordenadas válidas neste filtro. A vista do Brasil é apenas a área
          inicial do mapa.
        </p>
      )}
      {semLocalizacao.length > 0 && (
        <details className="px-5 py-3 border-t text-xs">
          <summary className="cursor-pointer">
            {semLocalizacao.length} recursos sem localização válida
          </summary>
          <ul className="mt-3 space-y-2">
            {semLocalizacao.map((p) => (
              <li key={p.id}>
                {p.nome || p.descricao} — {rotulo(p.situacao)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
