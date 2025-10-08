import streamlit as st
from vercel_client import VercelClient
from projects import Projects
from deployments import Deployments
from domains import Domains
from utils import format_json

st.title("Vercel API Dashboard")

# 🔹 Token FIXO
token = "Awk6YFryd6vv6IPddje7eJbR"  # Substitua pelo seu token real

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

    st.header("Firewall")
    if st.button("Consultar Firewall"):
        import requests
        try:
            # Substitua a URL abaixo pela URL real do seu endpoint Vercel
            url = "https://hive-chi-woad.vercel.app/api/firewall"
            response = requests.get(url)
            response.raise_for_status()
            st.code(format_json(response.json()), language="json")
        except requests.exceptions.RequestException as e:
            st.error(f"Erro ao consultar firewall: {e}")