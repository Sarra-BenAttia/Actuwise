"""
SinistrIA — Interface Agent Sinistres
Application Streamlit complète pour la gestion des dossiers sinistres

Lancement : streamlit run app_agent.py
"""

import streamlit as st
import pandas as pd
import numpy as np
import json
import os
import random
from datetime import datetime, timedelta
import plotly.graph_objects as go
import plotly.express as px
from PIL import Image
import qrcode
import io

# ── Configuration page ────────────────────────────────────────────────────────
st.set_page_config(
    page_title  = 'SinistrIA — Interface Agent',
    page_icon   = '🚗',
    layout      = 'wide',
    initial_sidebar_state = 'expanded',
)

# ── CSS personnalisé ──────────────────────────────────────────────────────────
st.markdown("""
<style>
    /* Couleurs principales */
    :root {
        --bleu-sinistria  : #1a1a4e;
        --rouge-alerte    : #e74c3c;
        --orange-suspect  : #e67e00;
        --vert-ok         : #27ae60;
        --gris-fond       : #f8f9fa;
    }

    /* Bandeau titre */
    .titre-app {
        background: linear-gradient(135deg, #1a1a4e, #2980b9);
        color: white;
        padding: 20px 30px;
        border-radius: 10px;
        margin-bottom: 20px;
    }
    .titre-app h1 { color: white; margin: 0; font-size: 2rem; }
    .titre-app p  { color: #aad4f5; margin: 5px 0 0 0; }

    /* Carte KPI */
    .kpi-card {
        background: white;
        border-radius: 10px;
        padding: 20px;
        text-align: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        border-left: 5px solid #1a1a4e;
    }
    .kpi-card.rouge  { border-left-color: #e74c3c; }
    .kpi-card.orange { border-left-color: #e67e00; }
    .kpi-card.vert   { border-left-color: #27ae60; }
    .kpi-valeur { font-size: 2.2rem; font-weight: bold; color: #1a1a4e; }
    .kpi-label  { font-size: 0.85rem; color: #666; margin-top: 5px; }

    /* Badge statut */
    .badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: bold;
        color: white;
    }
    .badge-critique  { background: #e74c3c; }
    .badge-suspect   { background: #e67e00; }
    .badge-normal    { background: #27ae60; }
    .badge-attente   { background: #95a5a6; }
    .badge-cloture   { background: #2980b9; }

    /* Alerte box */
    .alerte-critique {
        background: #fdf0ef;
        border: 2px solid #e74c3c;
        border-radius: 8px;
        padding: 15px;
        margin: 10px 0;
    }
    .alerte-suspect {
        background: #fef9f0;
        border: 2px solid #e67e00;
        border-radius: 8px;
        padding: 15px;
        margin: 10px 0;
    }
    .alerte-ok {
        background: #f0fdf4;
        border: 2px solid #27ae60;
        border-radius: 8px;
        padding: 15px;
        margin: 10px 0;
    }

    /* Tableau dossiers */
    .dossier-row {
        background: white;
        border-radius: 8px;
        padding: 12px 15px;
        margin: 6px 0;
        box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        border-left: 4px solid #1a1a4e;
        cursor: pointer;
    }
    .dossier-row:hover { box-shadow: 0 3px 10px rgba(0,0,0,0.15); }

    /* Section titre */
    .section-titre {
        background: #f0f4ff;
        border-left: 4px solid #1a1a4e;
        padding: 8px 15px;
        border-radius: 0 8px 8px 0;
        margin: 15px 0 10px 0;
        font-weight: bold;
        color: #1a1a4e;
    }

    /* Responsabilité gauge */
    .resp-bar {
        height: 30px;
        border-radius: 15px;
        display: flex;
        overflow: hidden;
        margin: 10px 0;
    }
</style>
""", unsafe_allow_html=True)


# ── Données simulées ──────────────────────────────────────────────────────────
@st.cache_data
def generer_dossiers_simules(n=25):
    """Génère des dossiers sinistres simulés pour la démo"""
    random.seed(42)
    types_accident = ['CHOC_ARRIERE','CHOC_LATERAL','CARREFOUR','DEPASSEMENT','STATIONNEMENT']
    assureurs      = ['STAR Assurances','GAT Assurances','COMAR','BH Assurance','Salim Assurances']
    marques        = ['Volkswagen Golf','Peugeot 308','Renault Clio','Toyota Corolla','Hyundai Tucson','Kia Sportage']
    villes         = ['Tunis','Sfax','Sousse','Monastir','Bizerte','Nabeul','Kairouan']
    statuts        = ['EN_ATTENTE','EN_COURS','CLOTURE','SUSPENDU']
    noms           = ['BEN ALI Mohamed','TRABELSI Sami','HAMDI Fatma','BOUAZIZ Ahmed',
                      'MANSOURI Leila','KAROUI Youssef','GHARBI Nadia','JEBALI Omar']

    dossiers = []
    for i in range(n):
        score_fraude = random.uniform(0, 1)
        if score_fraude >= 0.7:   alerte = '🔴 CRITIQUE'
        elif score_fraude >= 0.4: alerte = '🟠 SUSPECT'
        else:                     alerte = '🟢 NORMAL'

        type_acc = random.choice(types_accident)
        resp_a   = 0 if type_acc != 'CHOC_LATERAL' else 50
        resp_b   = 100 - resp_a
        cout     = random.randint(800, 15000)
        date_acc = datetime.now() - timedelta(days=random.randint(1, 90))

        dossiers.append({
            'id'                  : f'SIN-TN-{date_acc.strftime("%Y%m%d")}-{i+1001}',
            'date_accident'       : date_acc.strftime('%d/%m/%Y'),
            'heure_accident'      : f'{random.randint(6,22)}H{random.choice(["00","15","30","45"])}',
            'lieu'                : f'Av. {random.choice(["Habib Bourguiba","de la République","du 7 Novembre"])}, {random.choice(villes)}',
            'type_accident'       : type_acc,
            'conducteur_A'        : random.choice(noms),
            'immat_A'             : f'{random.randint(100,999)} TU {random.randint(1000,9999)}',
            'marque_A'            : random.choice(marques),
            'assureur_A'          : random.choice(assureurs),
            'conducteur_B'        : random.choice(noms),
            'immat_B'             : f'{random.randint(100,999)} TU {random.randint(1000,9999)}',
            'marque_B'            : random.choice(marques),
            'assureur_B'          : random.choice(assureurs),
            'degats'              : random.sample(['scratch','dent','crack','glass_shatter','lamp_broken'], k=random.randint(1,3)),
            'cout_estime_dt'      : cout,
            'score_fraude'        : round(score_fraude, 3),
            'alerte_fraude'       : alerte,
            'responsabilite_A_pct': resp_a,
            'responsabilite_B_pct': resp_b,
            'blesses'             : random.choice(['NON','NON','NON','OUI']),
            'statut'              : random.choice(statuts),
            'documents_complets'  : random.choice([True, True, True, False]),
            'agent_assigne'       : random.choice(['Agent Dupont','Agent Martin','Agent Trabelsi','Non assigné']),
        })
    return dossiers


dossiers = generer_dossiers_simules(25)
df_dossiers = pd.DataFrame(dossiers)


# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("""
    <div style='text-align:center; padding:15px; background:#1a1a4e;
                border-radius:10px; margin-bottom:20px;'>
        <h2 style='color:white; margin:0;'>🚗 SinistrIA</h2>
        <p style='color:#aad4f5; margin:5px 0 0 0; font-size:0.85rem;'>
            Interface Agent Sinistres
        </p>
    </div>
    """, unsafe_allow_html=True)

    page = st.radio(
        '📋 Navigation',
        ['🏠 Tableau de bord', '📁 Liste des dossiers', '🔍 Détail dossier', '📊 Statistiques'],
        label_visibility='collapsed'
    )

    st.divider()

    # Filtres
    st.markdown('**🔍 Filtres**')
    filtre_statut = st.multiselect(
        'Statut', ['EN_ATTENTE','EN_COURS','CLOTURE','SUSPENDU'],
        default=['EN_ATTENTE','EN_COURS']
    )
    filtre_alerte = st.multiselect(
        'Alerte fraude',
        ['🔴 CRITIQUE','🟠 SUSPECT','🟢 NORMAL'],
        default=['🔴 CRITIQUE','🟠 SUSPECT','🟢 NORMAL']
    )
    filtre_montant = st.slider('Coût estimé (DT)', 0, 20000, (0, 20000), step=500)

    st.divider()
    st.markdown(f'**👤 Agent connecté**')
    st.markdown('Agent Trabelsi')
    st.markdown(f'*{datetime.now().strftime("%d/%m/%Y %H:%M")}*')


# ── Filtrage des données ──────────────────────────────────────────────────────
df_filtre = df_dossiers[
    (df_dossiers['statut'].isin(filtre_statut)) &
    (df_dossiers['alerte_fraude'].isin(filtre_alerte)) &
    (df_dossiers['cout_estime_dt'].between(*filtre_montant))
]


# ════════════════════════════════════════════════════════════════════════════════
# PAGE 1 — TABLEAU DE BORD
# ════════════════════════════════════════════════════════════════════════════════
if page == '🏠 Tableau de bord':

    st.markdown("""
    <div class='titre-app'>
        <h1>🏠 Tableau de bord</h1>
        <p>Vue d'ensemble des dossiers sinistres — SinistrIA Tunisie 🇹🇳</p>
    </div>
    """, unsafe_allow_html=True)

    # ── KPIs ─────────────────────────────────────────────────────────
    k1, k2, k3, k4, k5 = st.columns(5)

    total       = len(df_dossiers)
    en_attente  = len(df_dossiers[df_dossiers['statut']=='EN_ATTENTE'])
    critiques   = len(df_dossiers[df_dossiers['alerte_fraude']=='🔴 CRITIQUE'])
    suspects    = len(df_dossiers[df_dossiers['alerte_fraude']=='🟠 SUSPECT'])
    cout_total  = df_dossiers['cout_estime_dt'].sum()

    with k1:
        st.markdown(f"""
        <div class='kpi-card'>
            <div class='kpi-valeur'>{total}</div>
            <div class='kpi-label'>📁 Total dossiers</div>
        </div>""", unsafe_allow_html=True)
    with k2:
        st.markdown(f"""
        <div class='kpi-card orange'>
            <div class='kpi-valeur'>{en_attente}</div>
            <div class='kpi-label'>⏳ En attente</div>
        </div>""", unsafe_allow_html=True)
    with k3:
        st.markdown(f"""
        <div class='kpi-card rouge'>
            <div class='kpi-valeur'>{critiques}</div>
            <div class='kpi-label'>🔴 Alertes critiques</div>
        </div>""", unsafe_allow_html=True)
    with k4:
        st.markdown(f"""
        <div class='kpi-card orange'>
            <div class='kpi-valeur'>{suspects}</div>
            <div class='kpi-label'>🟠 Suspects</div>
        </div>""", unsafe_allow_html=True)
    with k5:
        st.markdown(f"""
        <div class='kpi-card vert'>
            <div class='kpi-valeur'>{cout_total:,.0f}</div>
            <div class='kpi-label'>💰 Coût total (DT)</div>
        </div>""", unsafe_allow_html=True)

    st.divider()

    # ── Graphiques ────────────────────────────────────────────────────
    col1, col2, col3 = st.columns(3)

    with col1:
        st.markdown('**📊 Dossiers par statut**')
        statuts_count = df_dossiers['statut'].value_counts()
        fig = px.pie(
            values=statuts_count.values,
            names=statuts_count.index,
            color_discrete_sequence=['#3498db','#e67e00','#27ae60','#95a5a6'],
            hole=0.4,
        )
        fig.update_layout(height=280, margin=dict(t=10,b=10,l=10,r=10),
                          showlegend=True, legend=dict(font=dict(size=11)))
        st.plotly_chart(fig, use_container_width=True)

    with col2:
        st.markdown('**🚨 Alertes fraude**')
        alertes_count = df_dossiers['alerte_fraude'].value_counts()
        couleurs_alertes = {
            '🔴 CRITIQUE': '#e74c3c',
            '🟠 SUSPECT' : '#e67e00',
            '🟢 NORMAL'  : '#27ae60',
        }
        fig2 = px.bar(
            x=alertes_count.index,
            y=alertes_count.values,
            color=alertes_count.index,
            color_discrete_map=couleurs_alertes,
            text=alertes_count.values,
        )
        fig2.update_traces(textposition='outside')
        fig2.update_layout(height=280, margin=dict(t=10,b=10,l=10,r=10),
                           showlegend=False, xaxis_title='', yaxis_title='Nb dossiers')
        st.plotly_chart(fig2, use_container_width=True)

    with col3:
        st.markdown('**🚗 Types d\'accidents**')
        types_count = df_dossiers['type_accident'].value_counts()
        fig3 = px.bar(
            x=types_count.values,
            y=types_count.index,
            orientation='h',
            color=types_count.values,
            color_continuous_scale='Blues',
            text=types_count.values,
        )
        fig3.update_traces(textposition='outside')
        fig3.update_layout(height=280, margin=dict(t=10,b=10,l=10,r=10),
                           showlegend=False, coloraxis_showscale=False,
                           xaxis_title='Nb', yaxis_title='')
        st.plotly_chart(fig3, use_container_width=True)

    # ── Dossiers urgents ──────────────────────────────────────────────
    st.divider()
    st.markdown('### 🔴 Dossiers urgents — Alertes critiques')
    urgents = df_dossiers[df_dossiers['alerte_fraude']=='🔴 CRITIQUE'].head(5)

    for _, row in urgents.iterrows():
        col_a, col_b, col_c, col_d, col_e = st.columns([3,2,2,2,1])
        with col_a:
            st.markdown(f"**{row['id']}**")
            st.caption(f"📍 {row['lieu'][:35]}...")
        with col_b:
            st.markdown(f"👤 {row['conducteur_A']}")
            st.caption(f"🚗 {row['immat_A']}")
        with col_c:
            st.markdown(f"💰 **{row['cout_estime_dt']:,} DT**")
            st.caption(f"📅 {row['date_accident']}")
        with col_d:
            st.markdown(f"🚨 Score fraude : **{row['score_fraude']:.0%}**")
            st.caption(row['type_accident'].replace('_',' '))
        with col_e:
            st.markdown(f"<span class='badge badge-critique'>CRITIQUE</span>",
                        unsafe_allow_html=True)
        st.divider()

    # ── Evolution coûts ───────────────────────────────────────────────
    st.markdown('### 💰 Évolution des coûts estimés')
    df_sorted = df_dossiers.sort_values('date_accident')
    fig4 = px.line(
        df_sorted,
        x='date_accident',
        y='cout_estime_dt',
        color='alerte_fraude',
        color_discrete_map={
            '🔴 CRITIQUE': '#e74c3c',
            '🟠 SUSPECT' : '#e67e00',
            '🟢 NORMAL'  : '#27ae60',
        },
        markers=True,
        labels={'cout_estime_dt':'Coût (DT)', 'date_accident':'Date'},
    )
    fig4.update_layout(height=300, margin=dict(t=10,b=10,l=10,r=10))
    st.plotly_chart(fig4, use_container_width=True)


# ════════════════════════════════════════════════════════════════════════════════
# PAGE 2 — LISTE DES DOSSIERS
# ════════════════════════════════════════════════════════════════════════════════
elif page == '📁 Liste des dossiers':

    st.markdown("""
    <div class='titre-app'>
        <h1>📁 Liste des dossiers</h1>
        <p>Tous les dossiers sinistres — triés par date décroissante</p>
    </div>
    """, unsafe_allow_html=True)

    st.markdown(f'**{len(df_filtre)} dossiers** correspondent aux filtres sélectionnés')

    # Tri
    col_tri1, col_tri2 = st.columns([2,1])
    with col_tri1:
        tri_par = st.selectbox('Trier par', ['date_accident','cout_estime_dt','score_fraude','statut'])
    with col_tri2:
        ordre = st.radio('Ordre', ['Décroissant','Croissant'], horizontal=True)

    df_affiche = df_filtre.sort_values(
        tri_par,
        ascending=(ordre == 'Croissant')
    )

    # Entêtes colonnes
    h1, h2, h3, h4, h5, h6, h7 = st.columns([2.5,1.5,2,2,1.5,1.5,1])
    for col, titre in zip([h1,h2,h3,h4,h5,h6,h7],
                           ['ID Dossier','Date','Conducteur A','Type Accident',
                            'Coût (DT)','Fraude','Statut']):
        col.markdown(f'**{titre}**')
    st.divider()

    # Lignes
    for _, row in df_affiche.iterrows():
        c1,c2,c3,c4,c5,c6,c7 = st.columns([2.5,1.5,2,2,1.5,1.5,1])
        with c1: st.markdown(f"`{row['id']}`")
        with c2: st.caption(row['date_accident'])
        with c3: st.markdown(row['conducteur_A'])
        with c4: st.caption(row['type_accident'].replace('_',' '))
        with c5: st.markdown(f"**{row['cout_estime_dt']:,}**")
        with c6:
            if '🔴' in row['alerte_fraude']:
                st.markdown(f"<span class='badge badge-critique'>CRITIQUE</span>",
                            unsafe_allow_html=True)
            elif '🟠' in row['alerte_fraude']:
                st.markdown(f"<span class='badge badge-suspect'>SUSPECT</span>",
                            unsafe_allow_html=True)
            else:
                st.markdown(f"<span class='badge badge-normal'>NORMAL</span>",
                            unsafe_allow_html=True)
        with c7:
            badge_cls = 'badge-attente' if row['statut']=='EN_ATTENTE' else \
                        'badge-cloture' if row['statut']=='CLOTURE' else 'badge-normal'
            st.markdown(f"<span class='badge {badge_cls}'>{row['statut'][:3]}</span>",
                        unsafe_allow_html=True)

    st.divider()

    # Export CSV
    csv = df_affiche.to_csv(index=False).encode('utf-8')
    st.download_button(
        '⬇️ Exporter en CSV',
        data=csv,
        file_name=f'dossiers_sinistria_{datetime.now().strftime("%Y%m%d")}.csv',
        mime='text/csv',
    )


# ════════════════════════════════════════════════════════════════════════════════
# PAGE 3 — DÉTAIL DOSSIER
# ════════════════════════════════════════════════════════════════════════════════
elif page == '🔍 Détail dossier':

    st.markdown("""
    <div class='titre-app'>
        <h1>🔍 Détail dossier sinistre</h1>
        <p>Vue complète — informations, alertes et décisions</p>
    </div>
    """, unsafe_allow_html=True)

    # Sélection dossier
    ids_dossiers = df_dossiers['id'].tolist()
    id_selectionne = st.selectbox('📋 Sélectionner un dossier', ids_dossiers)
    dossier = df_dossiers[df_dossiers['id'] == id_selectionne].iloc[0]

    st.divider()

    # ── ALERTES EN TÊTE ───────────────────────────────────────────────
    st.markdown('### 🚨 Alertes')
    al1, al2, al3 = st.columns(3)

    # Alerte fraude
    with al1:
        if '🔴' in dossier['alerte_fraude']:
            st.markdown(f"""
            <div class='alerte-critique'>
                <b>🔴 FRAUDE CRITIQUE</b><br>
                Score : <b>{dossier['score_fraude']:.0%}</b><br>
                <small>→ Investigation immédiate requise</small>
            </div>""", unsafe_allow_html=True)
        elif '🟠' in dossier['alerte_fraude']:
            st.markdown(f"""
            <div class='alerte-suspect'>
                <b>🟠 DOSSIER SUSPECT</b><br>
                Score : <b>{dossier['score_fraude']:.0%}</b><br>
                <small>→ Vérification approfondie</small>
            </div>""", unsafe_allow_html=True)
        else:
            st.markdown(f"""
            <div class='alerte-ok'>
                <b>🟢 FRAUDE : NORMAL</b><br>
                Score : <b>{dossier['score_fraude']:.0%}</b><br>
                <small>→ Traitement standard</small>
            </div>""", unsafe_allow_html=True)

    # Alerte blessés
    with al2:
        if dossier['blesses'] == 'OUI':
            st.markdown("""
            <div class='alerte-critique'>
                <b>🚑 BLESSÉS SIGNALÉS</b><br>
                Intervention médicale requise<br>
                <small>→ Contacter le service médical</small>
            </div>""", unsafe_allow_html=True)
        else:
            st.markdown("""
            <div class='alerte-ok'>
                <b>✅ AUCUN BLESSÉ</b><br>
                Sinistre matériel uniquement<br>
                <small>→ Traitement standard</small>
            </div>""", unsafe_allow_html=True)

    # Alerte documents
    with al3:
        if not dossier['documents_complets']:
            st.markdown("""
            <div class='alerte-suspect'>
                <b>⚠️ DOCUMENTS INCOMPLETS</b><br>
                Des pièces manquent au dossier<br>
                <small>→ Relancer le client</small>
            </div>""", unsafe_allow_html=True)
        else:
            st.markdown("""
            <div class='alerte-ok'>
                <b>✅ DOCUMENTS COMPLETS</b><br>
                Permis + Carte grise + Constat<br>
                <small>→ Dossier complet</small>
            </div>""", unsafe_allow_html=True)

    st.divider()

    # ── INFOS ACCIDENT ────────────────────────────────────────────────
    st.markdown('<div class="section-titre">🗺️ Informations Accident</div>',
                unsafe_allow_html=True)
    i1, i2, i3, i4 = st.columns(4)
    i1.metric('📅 Date', dossier['date_accident'])
    i2.metric('⏰ Heure', dossier['heure_accident'])
    i3.metric('🚗 Type', dossier['type_accident'].replace('_',' '))
    i4.metric('🚑 Blessés', dossier['blesses'])
    st.caption(f"📍 Lieu : {dossier['lieu']}")

    # ── VÉHICULES ─────────────────────────────────────────────────────
    st.markdown('<div class="section-titre">🚗 Parties impliquées</div>',
                unsafe_allow_html=True)
    va, vb = st.columns(2)

    with va:
        st.markdown('**🔵 Véhicule A**')
        st.markdown(f"👤 **{dossier['conducteur_A']}**")
        st.markdown(f"🚗 {dossier['marque_A']} — `{dossier['immat_A']}`")
        st.markdown(f"🏢 {dossier['assureur_A']}")
        st.metric('Responsabilité',
                  f"{dossier['responsabilite_A_pct']}%",
                  delta=f"{dossier['responsabilite_A_pct']-50}% vs partage égal" if dossier['responsabilite_A_pct'] != 50 else None)

    with vb:
        st.markdown('**🔴 Véhicule B**')
        st.markdown(f"👤 **{dossier['conducteur_B']}**")
        st.markdown(f"🚗 {dossier['marque_B']} — `{dossier['immat_B']}`")
        st.markdown(f"🏢 {dossier['assureur_B']}")
        st.metric('Responsabilité',
                  f"{dossier['responsabilite_B_pct']}%",
                  delta=f"{dossier['responsabilite_B_pct']-50}% vs partage égal" if dossier['responsabilite_B_pct'] != 50 else None,
                  delta_color='inverse')

    # Barre de responsabilité visuelle
    resp_a = dossier['responsabilite_A_pct']
    resp_b = dossier['responsabilite_B_pct']
    st.markdown(f"""
    <div style='margin:15px 0 5px 0; font-weight:bold;'>⚖️ Barème de responsabilité</div>
    <div style='display:flex; height:35px; border-radius:20px; overflow:hidden;'>
        <div style='width:{resp_a}%; background:#3498db; display:flex;
                    align-items:center; justify-content:center; color:white; font-weight:bold;'>
            A : {resp_a}%
        </div>
        <div style='width:{resp_b}%; background:#e74c3c; display:flex;
                    align-items:center; justify-content:center; color:white; font-weight:bold;'>
            B : {resp_b}%
        </div>
    </div>
    """, unsafe_allow_html=True)

    # ── ÉVALUATION DÉGÂTS ─────────────────────────────────────────────
    st.markdown('<div class="section-titre">🔍 Évaluation des dégâts (YOLO)</div>',
                unsafe_allow_html=True)
    d1, d2, d3 = st.columns(3)
    d1.metric('💰 Coût estimé', f"{dossier['cout_estime_dt']:,} DT")
    d2.metric('🔧 Dégâts détectés', ', '.join(dossier['degats']))
    d3.metric('🤖 Modèle', 'YOLOv8 fine-tuné')

    # Jauge coût
    fig_cout = go.Figure(go.Indicator(
        mode  = 'gauge+number+delta',
        value = dossier['cout_estime_dt'],
        delta = {'reference': df_dossiers['cout_estime_dt'].mean(),
                 'valueformat': '.0f'},
        gauge = {
            'axis'  : {'range': [0, 15000]},
            'bar'   : {'color': '#1a1a4e'},
            'steps' : [
                {'range': [0,    3000],  'color': '#d5f5e3'},
                {'range': [3000, 8000],  'color': '#fdebd0'},
                {'range': [8000, 15000], 'color': '#fadbd8'},
            ],
            'threshold': {
                'line' : {'color': 'red', 'width': 3},
                'value': df_dossiers['cout_estime_dt'].mean(),
            },
        },
        title = {'text': 'Coût estimé (DT)'},
        number= {'suffix': ' DT'},
    ))
    fig_cout.update_layout(height=250, margin=dict(t=30,b=10,l=20,r=20))
    st.plotly_chart(fig_cout, use_container_width=True)

    # ── SCORE FRAUDE ──────────────────────────────────────────────────
    st.markdown('<div class="section-titre">🚨 Score de fraude (XGBoost + Isolation Forest)</div>',
                unsafe_allow_html=True)

    f1, f2 = st.columns([1,2])
    with f1:
        fig_fraude = go.Figure(go.Indicator(
            mode  = 'gauge+number',
            value = dossier['score_fraude'] * 100,
            gauge = {
                'axis' : {'range': [0, 100]},
                'bar'  : {'color': '#e74c3c' if dossier['score_fraude'] >= 0.7
                                   else '#e67e00' if dossier['score_fraude'] >= 0.4
                                   else '#27ae60'},
                'steps': [
                    {'range': [0,  40],  'color': '#d5f5e3'},
                    {'range': [40, 70],  'color': '#fdebd0'},
                    {'range': [70, 100], 'color': '#fadbd8'},
                ],
                'threshold': {'line': {'color':'red','width':3}, 'value': 70},
            },
            title = {'text': 'Score Fraude (%)'},
            number= {'suffix': '%'},
        ))
        fig_fraude.update_layout(height=250, margin=dict(t=30,b=10,l=20,r=20))
        st.plotly_chart(fig_fraude, use_container_width=True)

    with f2:
        st.markdown(f"**Niveau d'alerte :** {dossier['alerte_fraude']}")
        st.markdown(f"**Score :** `{dossier['score_fraude']:.3f}`")
        if dossier['score_fraude'] >= 0.7:
            st.error('⛔ Action requise : Investigation immédiate — Bloquer le paiement')
        elif dossier['score_fraude'] >= 0.4:
            st.warning('⚠️ Action requise : Demander documents supplémentaires')
        else:
            st.success('✅ Dossier normal — Traitement standard autorisé')

        # Signaux détectés
        st.markdown('**Signaux détectés :**')
        signaux = []
        if dossier['cout_estime_dt'] > df_dossiers['cout_estime_dt'].quantile(0.85):
            signaux.append('💰 Montant anormalement élevé')
        if dossier['blesses'] == 'OUI' and dossier['score_fraude'] > 0.5:
            signaux.append('🚑 Blessés + score élevé')
        if not dossier['documents_complets']:
            signaux.append('📄 Documents incomplets')
        if not signaux:
            signaux.append('✅ Aucun signal anormal détecté')
        for s in signaux:
            st.markdown(f'  - {s}')

    # ── ACTIONS AGENT ─────────────────────────────────────────────────
    st.divider()
    st.markdown('### ⚡ Actions agent')
    ac1, ac2, ac3, ac4 = st.columns(4)

    with ac1:
        if st.button('✅ Valider le dossier', type='primary', use_container_width=True):
            st.success(f'Dossier {id_selectionne} validé !')
    with ac2:
        if st.button('🚨 Signaler fraude', use_container_width=True):
            st.error('Dossier signalé pour investigation fraude !')
    with ac3:
        if st.button('📧 Relancer client', use_container_width=True):
            st.info('Email de relance envoyé au client !')
    with ac4:
        if st.button('❌ Rejeter dossier', use_container_width=True):
            st.warning('Dossier rejeté !')

    # Notes agent
    st.text_area('📝 Notes agent', placeholder='Ajouter une note sur ce dossier...')
    if st.button('💾 Sauvegarder notes'):
        st.success('Notes sauvegardées !')

    # QR Code
    st.divider()
    st.markdown('### 📱 QR Code du dossier')
    qr_data = json.dumps({
        'id'     : dossier['id'],
        'date'   : dossier['date_accident'],
        'cout'   : dossier['cout_estime_dt'],
        'fraude' : dossier['alerte_fraude'],
    })
    qr = qrcode.make(qr_data)
    buf = io.BytesIO()
    qr.save(buf)
    buf.seek(0)
    q1, q2 = st.columns([1,3])
    with q1:
        st.image(buf, width=180, caption='Scanner pour accéder au dossier')
    with q2:
        st.markdown(f"**ID :** `{dossier['id']}`")
        st.markdown(f"**Contenu encodé :** Infos accident + score fraude + coût")
        st.download_button('⬇️ Télécharger QR Code', buf.getvalue(),
                           f'qr_{id_selectionne}.png', 'image/png')


# ════════════════════════════════════════════════════════════════════════════════
# PAGE 4 — STATISTIQUES
# ════════════════════════════════════════════════════════════════════════════════
elif page == '📊 Statistiques':

    st.markdown("""
    <div class='titre-app'>
        <h1>📊 Statistiques globales</h1>
        <p>Analyse du portefeuille sinistres SinistrIA</p>
    </div>
    """, unsafe_allow_html=True)

    # ── Distribution coûts ────────────────────────────────────────────
    col1, col2 = st.columns(2)

    with col1:
        st.markdown('**💰 Distribution des coûts estimés**')
        fig = px.histogram(
            df_dossiers, x='cout_estime_dt',
            nbins=20, color='alerte_fraude',
            color_discrete_map={
                '🔴 CRITIQUE':'#e74c3c',
                '🟠 SUSPECT':'#e67e00',
                '🟢 NORMAL':'#27ae60',
            },
            labels={'cout_estime_dt':'Coût (DT)'},
            barmode='overlay', opacity=0.7,
        )
        fig.update_layout(height=300, margin=dict(t=10,b=10,l=10,r=10))
        st.plotly_chart(fig, use_container_width=True)

    with col2:
        st.markdown('**📈 Score fraude vs Coût estimé**')
        fig2 = px.scatter(
            df_dossiers,
            x='score_fraude', y='cout_estime_dt',
            color='alerte_fraude',
            color_discrete_map={
                '🔴 CRITIQUE':'#e74c3c',
                '🟠 SUSPECT':'#e67e00',
                '🟢 NORMAL':'#27ae60',
            },
            size='cout_estime_dt',
            hover_data=['id','conducteur_A','type_accident'],
            labels={'score_fraude':'Score Fraude','cout_estime_dt':'Coût (DT)'},
        )
        fig2.add_vline(x=0.7, line_dash='dash', line_color='red', annotation_text='Seuil critique')
        fig2.add_vline(x=0.4, line_dash='dash', line_color='orange', annotation_text='Seuil suspect')
        fig2.update_layout(height=300, margin=dict(t=10,b=10,l=10,r=10))
        st.plotly_chart(fig2, use_container_width=True)

    # ── Tableau récapitulatif ─────────────────────────────────────────
    st.markdown('**📋 Récapitulatif par type d\'accident**')
    recap = df_dossiers.groupby('type_accident').agg(
        nb_dossiers    = ('id',             'count'),
        cout_moyen_dt  = ('cout_estime_dt', 'mean'),
        cout_total_dt  = ('cout_estime_dt', 'sum'),
        score_fraude_moy= ('score_fraude',  'mean'),
        resp_A_moy     = ('responsabilite_A_pct', 'mean'),
        resp_B_moy     = ('responsabilite_B_pct', 'mean'),
    ).round(1).reset_index()
    recap.columns = ['Type accident','Nb dossiers','Coût moyen (DT)',
                     'Coût total (DT)','Score fraude moy','Resp. A%','Resp. B%']
    st.dataframe(recap, use_container_width=True, hide_index=True)

    # ── Métriques clés ────────────────────────────────────────────────
    st.markdown('**🎯 Métriques clés SinistrIA**')
    m1, m2, m3, m4 = st.columns(4)
    m1.metric('🎯 Taux détection fraude',
              f"{len(df_dossiers[df_dossiers['score_fraude']>=0.4])/len(df_dossiers)*100:.0f}%")
    m2.metric('💰 Coût moyen sinistre',
              f"{df_dossiers['cout_estime_dt'].mean():,.0f} DT")
    m3.metric('📁 Dossiers clôturés',
              f"{len(df_dossiers[df_dossiers['statut']=='CLOTURE'])}/{len(df_dossiers)}")
    m4.metric('✅ Dossiers complets',
              f"{df_dossiers['documents_complets'].sum()}/{len(df_dossiers)}")
