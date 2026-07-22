import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useInView } from 'react-intersection-observer'
import { useAPI } from '../hooks/useAPI'
import { getStats, getResultatsCles, formatNumber, formatTND, formatPct } from '../services/api'
import { useStyles, useBodyClass } from '../hooks/useStyles'

// ============================================================
// Composant utilitaire — Compteur animé au scroll
// ============================================================
function AnimatedCounter({ end, duration = 2000, suffix = '', prefix = '', decimals = 0 }) {
  const [count, setCount] = useState(0)
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true })
  const startTime = useRef(null)
  const rafId = useRef(null)

  useEffect(() => {
    if (!inView || !end) return

    const animate = (timestamp) => {
      if (!startTime.current) startTime.current = timestamp
      const progress = Math.min((timestamp - startTime.current) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // Easing cubique
      setCount(eased * end)

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate)
      } else {
        setCount(end)
      }
    }

    rafId.current = requestAnimationFrame(animate)
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [inView, end, duration])

  const display = decimals > 0
    ? count.toFixed(decimals)
    : Math.floor(count).toLocaleString('fr-TN')

  return (
    <span ref={ref}>
      {prefix}{display}{suffix}
    </span>
  )
}

export default function Home() {
  // Chargement des styles du template Arsha de façon dynamique pour éviter les conflits
  useStyles([
    '/assets/vendor/bootstrap/css/bootstrap.min.css',
    '/assets/vendor/bootstrap-icons/bootstrap-icons.css',
    '/assets/vendor/aos/aos.css',
    '/assets/vendor/glightbox/css/glightbox.min.css',
    '/assets/vendor/swiper/swiper-bundle.min.css',
    '/assets/css/main.css'
  ])

  // Ajout de la classe body spécifique au template Arsha
  useBodyClass(['index-page'])

  // Appels API
  const { data: statsData, loading: statsLoading } = useAPI(getStats)
  const { data: resultatsData, loading: resultatsLoading } = useAPI(getResultatsCles)

  const stats = statsData?.data || {}
  const resultats = resultatsData?.data || {}

  return (
    <div className="arsha-wrapper">
      {/* ======= Header / Navbar ======= */}
      <header id="header" className="header d-flex align-items-center fixed-top">
        <div className="container-fluid container-xl position-relative d-flex align-items-center">
          <a href="/" className="logo d-flex align-items-center me-auto">
            <h1 className="sitename">ACTUWISE</h1>
          </a>

          <nav id="navmenu" className="navmenu">
            <ul>
              <li><a href="#hero" className="active">Accueil</a></li>
              <li><a href="#modules">Modules</a></li>
              <li><a href="#pipeline">Pipeline IA</a></li>
              <li><a href="#stats">Données</a></li>
              <li><a href="#results">Résultats Clés</a></li>
            </ul>
            <i className="mobile-nav-toggle d-xl-none bi bi-list"></i>
          </nav>

          <Link to="/dashboard" className="btn-getstarted">
            Dashboard <i className="bi bi-arrow-right-short"></i>
          </Link>
        </div>
      </header>

      {/* ======= Hero Section ======= */}
      <section id="hero" className="hero section dark-background">
        <div className="container">
          <div className="row gy-4">
            <div className="col-lg-6 order-2 order-lg-1 d-flex flex-column justify-content-center">
              <h1>Plateforme Actuarielle Intelligente</h1>
              <p>ACTUWISE — La puissance du Machine Learning pour l'assurance automobile tunisienne.</p>
              
              <div className="d-flex gap-3 mt-3">
                <Link to="/dashboard" className="btn-get-started">Accéder au Dashboard</Link>
                <a href="#modules" className="btn-watch-video d-flex align-items-center text-white">
                  <i className="bi bi-chevron-down-circlefs-4"></i><span>Découvrir les Modules</span>
                </a>
              </div>

              {/* 4 chiffres clés animés */}
              <div className="row mt-5 text-center text-lg-start">
                <div className="col-3">
                  <h3 className="fw-bold text-white mb-1">
                    <AnimatedCounter end={94852} />
                  </h3>
                  <span className="text-secondary small">Polices</span>
                </div>
                <div className="col-3">
                  <h3 className="fw-bold text-white mb-1">
                    <AnimatedCounter end={64999} />
                  </h3>
                  <span className="text-secondary small">Sinistres</span>
                </div>
                <div className="col-3">
                  <h3 className="fw-bold text-white mb-1">
                    <AnimatedCounter end={7} />
                  </h3>
                  <span className="text-secondary small">Modules</span>
                </div>
                <div className="col-3">
                  <h3 className="fw-bold text-white mb-1">
                    <AnimatedCounter end={4} />
                  </h3>
                  <span className="text-secondary small">Niveaux IA</span>
                </div>
              </div>
            </div>
            <div className="col-lg-6 order-1 order-lg-2 hero-img">
              <img src="/assets/img/hero-img.png" className="img-fluid animated" alt="Actuwise Hero Image" />
            </div>
          </div>
        </div>
      </section>

      {/* ======= Section Modules (basé sur Services d'Arsha) ======= */}
      <section id="modules" className="services section light-background">
        <div className="container section-title">
          <h2>Les 7 Modules</h2>
          <p>Une suite complète d'outils actuariels classiques combinés aux dernières avancées en Intelligence Artificielle.</p>
        </div>

        <div className="container">
          <div className="row gy-4">
            {/* Module 0 */}
            <div className="col-xl-4 col-md-6 d-flex">
              <div className="service-item position-relative">
                <div className="icon"><i className="bi bi-folder2-open icon"></i></div>
                <h4><a href="#modules" className="stretched-link">Module 0 : Préparation des données</a></h4>
                <p>Nettoyage, feature engineering et jointure des bases polices et sinistres automobile.</p>
              </div>
            </div>

            {/* Module 1 */}
            <div className="col-xl-4 col-md-6 d-flex">
              <div className="service-item position-relative">
                <div className="icon"><i className="bi bi-graph-up icon"></i></div>
                <h4><a href="#modules" className="stretched-link">Module 1 : Analyse de la sinistralité</a></h4>
                <p>Visualisation des indicateurs clés et de la série mensuelle historique de sinistres.</p>
              </div>
            </div>

            {/* Module 2 */}
            <div className="col-xl-4 col-md-6 d-flex">
              <div className="service-item position-relative">
                <div className="icon"><i className="bi bi-shield-check icon"></i></div>
                <h4><a href="#modules" className="stretched-link">Module 2 : Provisionnement</a></h4>
                <p>Calcul des provisions IBNR classiques (CL, BF, Cape Cod) et benchmark avec XGBoost ML Reserving.</p>
              </div>
            </div>

            {/* Module 3 */}
            <div className="col-xl-4 col-md-6 d-flex">
              <div className="service-item position-relative">
                <div className="icon"><i className="bi bi-cpu icon"></i></div>
                <h4><a href="#modules" className="stretched-link">Module 3 : Modélisation des risques</a></h4>
                <p>Calcul de la prime pure en temps réel avec des modèles GLM, XGBoost et CANN + explicabilité SHAP.</p>
              </div>
            </div>

            {/* Module 4 */}
            <div className="col-xl-4 col-md-6 d-flex">
              <div className="service-item position-relative">
                <div className="icon">
                  <i className="bi bi-clock-history icon"></i>
                  <span className="badge bg-warning position-absolute top-0 end-0 m-2 font-monospace" style={{ fontSize: '10px' }}>🔜</span>
                </div>
                <h4><a href="#modules" className="stretched-link">Module 4 : Séries temporelles</a></h4>
                <p>Prévisions de sinistralité à 12 mois et alertes ratio combiné par modèles SARIMA &amp; LSTM.</p>
              </div>
            </div>

            {/* Module 5 */}
            <div className="col-xl-4 col-md-6 d-flex">
              <div className="service-item position-relative">
                <div className="icon"><i className="bi bi-layout-wtf icon"></i></div>
                <h4><a href="#modules" className="stretched-link">Module 5 : Dashboard Power BI</a></h4>
                <p>Tableaux de bord d'aide à la décision pour le pilotage financier de la compagnie.</p>
              </div>
            </div>

            {/* Module 6 */}
            <div className="col-xl-4 col-md-6 d-flex mx-auto">
              <div className="service-item position-relative">
                <div className="icon">
                  <i className="bi bi-chat-dots icon"></i>
                  <span className="badge bg-warning position-absolute top-0 end-0 m-2 font-monospace" style={{ fontSize: '10px' }}>🔜</span>
                </div>
                <h4><a href="#modules" className="stretched-link">Module 6 : Assistant IA</a></h4>
                <p>Assistant conversationnel basé sur RAG pour interroger les circulaires CGA et normes IFRS 17.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======= Section Pipeline IA (basé sur Skills d'Arsha) ======= */}
      <section id="pipeline" className="skills section">
        <div className="container section-title">
          <h2>Pipeline d'intégration IA</h2>
          <p>Le portefeuille d'assurance automobile tunisien analysé à travers 5 niveaux d'algorithmes et de modèles.</p>
        </div>

        <div className="container">
          <div className="row">
            <div className="col-lg-6 d-flex align-items-center">
              <img src="/assets/img/skills.png" className="img-fluid" alt="Pipeline IA" />
            </div>

            <div className="col-lg-6 pt-4 pt-lg-0 content">
              <h3>Du modèle classique à l'IA Générative</h3>
              <p className="fst-italic">
                ACTUWISE réunit la rigueur des méthodes réglementaires et la puissance prédictive du Deep Learning.
              </p>

              <div className="skills-content skills-animation">
                <div className="progress">
                  <span className="skill"><span>Niveau 1 : Actuariat classique (Chain-Ladder, BF, GLM)</span> <i className="val">100%</i></span>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar" role="progressbar" style={{ width: '100%' }}></div>
                  </div>
                </div>

                <div className="progress">
                  <span className="skill"><span>Niveau 2 : Machine Learning Supervisé (XGBoost Reserving / Risques)</span> <i className="val">95%</i></span>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar" role="progressbar" style={{ width: '95%' }}></div>
                  </div>
                </div>

                <div className="progress">
                  <span className="skill"><span>Niveau 3 : Machine Learning non supervisé (Clustering K-Means)</span> <i className="val">80%</i></span>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar" role="progressbar" style={{ width: '80%' }}></div>
                  </div>
                </div>

                <div className="progress">
                  <span className="skill"><span>Niveau 4 : Deep Learning (CANN PyTorch / LSTM)</span> <i className="val">75%</i></span>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar" role="progressbar" style={{ width: '75%' }}></div>
                  </div>
                </div>

                <div className="progress">
                  <span className="skill"><span>Niveau 5 : IA Générative (LLM + RAG persisté)</span> <i className="val">60%</i></span>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar" role="progressbar" style={{ width: '60%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======= Section Données (Cartes de statistiques depuis l'API) ======= */}
      <section id="stats" className="services section light-background">
        <div className="container section-title">
          <h2>Statistiques du Portefeuille</h2>
          <p>Visualisation globale des données de production sur 6 ans (2018-2023).</p>
        </div>

        <div className="container text-center">
          {statsLoading ? (
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Chargement...</span>
            </div>
          ) : (
            <div className="row g-4 justify-content-center">
              <div className="col-lg-3 col-md-6">
                <div className="card border-0 shadow-sm p-4 bg-white rounded-3">
                  <h2 className="fw-bold text-primary mb-2">{formatNumber(stats.nb_polices || 94852)}</h2>
                  <p className="text-muted m-0">Polices en production</p>
                </div>
              </div>
              <div className="col-lg-3 col-md-6">
                <div className="card border-0 shadow-sm p-4 bg-white rounded-3">
                  <h2 className="fw-bold text-primary mb-2">{formatNumber(stats.nb_sinistres || 64999)}</h2>
                  <p className="text-muted m-0">Sinistres enregistrés</p>
                </div>
              </div>
              <div className="col-lg-3 col-md-6">
                <div className="card border-0 shadow-sm p-4 bg-white rounded-3">
                  <h2 className="fw-bold text-primary mb-2">{stats.periode || '2018-2023'}</h2>
                  <p className="text-muted m-0">Période d'observation</p>
                </div>
              </div>
              <div className="col-lg-3 col-md-6">
                <div className="card border-0 shadow-sm p-4 bg-white rounded-3">
                  <h2 className="fw-bold text-primary mb-2">{stats.ratio_combine_2023 ? formatPct(stats.ratio_combine_2023) : '94.8%'}</h2>
                  <p className="text-muted m-0">Ratio combiné actuel (2023)</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ======= Section Résultats Clés ======= */}
      <section id="results" className="services section">
        <div className="container section-title">
          <h2>Résultats Clés</h2>
          <p>Les métriques phares calculées automatiquement par nos meilleurs modèles IA en production.</p>
        </div>

        <div className="container text-center">
          {resultatsLoading ? (
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Chargement...</span>
            </div>
          ) : (
            <div className="row g-4 justify-content-center">
              {/* Gini Risques */}
              <div className="col-lg-4 col-md-6">
                <div className="card border-0 shadow p-4 bg-white rounded-3">
                  <span className="text-secondary text-uppercase small fw-bold">Performance Risques</span>
                  <h2 className="fw-bold text-success my-3">
                    {resultats.gini?.valeur ? resultats.gini.valeur.toFixed(4) : '0.4285'}
                  </h2>
                  <p className="text-muted small mb-2">Meilleur Gini (Modèle : {resultats.gini?.modele || 'XGBoost'})</p>
                </div>
              </div>

              {/* IBNR Totale */}
              <div className="col-lg-4 col-md-6">
                <div className="card border-0 shadow p-4 bg-white rounded-3">
                  <span className="text-secondary text-uppercase small fw-bold">Provisionnement global</span>
                  <h2 className="fw-bold text-primary my-3">
                    {resultats.ibnr?.valeur ? formatTND(resultats.ibnr.valeur) : '60 412 110 TND'}
                  </h2>
                  <p className="text-muted small mb-2">Réserves IBNR (Modèle : {resultats.ibnr?.modele || 'Chain-Ladder'})</p>
                </div>
              </div>

              {/* Ratio Combiné 2024 */}
              <div className="col-lg-4 col-md-6">
                <div className="card border-0 shadow p-4 bg-white rounded-3 position-relative">
                  <span className="text-secondary text-uppercase small fw-bold">Prévision Financière</span>
                  <h2 className="fw-bold text-secondary my-3">— %</h2>
                  <p className="text-muted small mb-2">Ratio combiné prévu 2024 (Module 4)</p>
                  <span className="badge bg-warning position-absolute top-0 end-0 m-2 font-monospace" style={{ fontSize: '9px' }}>🔜</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ======= Footer ======= */}
      <footer id="footer" className="footer">
        <div className="container copyright text-center mt-4">
          <p>© <span>Copyright</span> <strong className="px-1 sitename">ACTUWISE</strong> <span>Tous droits réservés</span></p>
          <div className="credits">
            Plateforme Actuarielle Intelligente pour l'Assurance Automobile Tunisienne
          </div>
        </div>
      </footer>
    </div>
  )
}
