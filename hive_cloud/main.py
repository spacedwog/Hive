import streamlit as st
from vercel_client import VercelClient
from projects import Projects
from deployments import Deployments
from domains import Domains
from utils import format_json

st.title("Vercel API Dashboard")

# 🔹 Input manual do token
if "token_enviado" not in st.session_state:
    st.session_state.token_enviado = False
if not st.session_state.token_enviado:
    token_input = st.text_input("Insira seu Vercel Token", type="password", key="token_input")
    if st.button("Enviar Token"):
        if token_input:
            st.session_state.token = token_input
            st.session_state.token_enviado = True
            st.success("Token enviado com sucesso!")
        else:
            st.warning("Por favor, insira um token antes de enviar.")
    token = None
else:
    token = st.session_state.token
    st.info("Token enviado e salvo!")

# 🔹 Inicializa as APIs se um token estiver selecionado
if token:
    client = VercelClient(token)
    projects_api = Projects(client)
    deployments_api = Deployments(client)
    domains_api = Domains(client)

    st.header("Projetos")
    if st.button("Listar Projetos"):
        projects = projects_api.list_projects()
        st.code(format_json(projects), language="json")

    st.header("Deployments")

    # Primeiro, pega os projetos disponíveis
    projects = projects_api.list_projects()
    # Cria um dicionário para mapear nome do projeto para seu id
    project_map = {p["name"]: p["id"] for p in projects.get("projects", [])}
    project_names = list(project_map.keys())

    selected_project = st.selectbox(
        "Selecione um projeto para ver os deployments:",
        project_names or ["Nenhum projeto encontrado"],
    )

    if st.button("Listar Deployments"):
        if selected_project != "Nenhum projeto encontrado":
            project_id = project_map[selected_project]
            try:
                deployments = deployments_api.list_deployments(project_id=project_id)
                st.code(format_json(deployments), language="json")
            except Exception as e:
                import requests
                if isinstance(e, requests.exceptions.HTTPError):
                    st.error(f"Erro na requisição: {e.response.status_code} - {e.response.text}")
                else:
                    st.error(f"Erro: {str(e)}")
        else:
            st.warning("Nenhum projeto disponível para listar os deployments.")

    st.header("Domínios")
    if st.button("Listar Domínios"):
        domains = domains_api.list_domains()
        st.code(format_json(domains), language="json")