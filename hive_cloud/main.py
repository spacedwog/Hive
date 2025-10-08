import streamlit as st
from vercel_client import VercelClient
from projects import Projects
from deployments import Deployments
from domains import Domains
from utils import format_json
import requests

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
            except requests.exceptions.HTTPError as e:
                st.error(f"Erro na requisição: {e.response.status_code} - {e.response.text}")
            except Exception as e:
                st.error(f"Erro: {str(e)}")
        else:
            st.warning("Nenhum projeto disponível para listar os deployments.")

    st.header("Domínios")
    if st.button("Listar Domínios"):
        domains = domains_api.list_domains()
        st.code(format_json(domains), language="json")

    st.header("Menu Firewall - HIVE")
    BASE_URL = "https://hive-chi-woad.vercel.app/api/firewall"

    rotas = [
        {"nome": "Info do Firewall", "action": "info", "method": "GET"},
        {"nome": "IPs Bloqueados", "action": "blocked", "method": "GET"},
        {"nome": "Bloquear IP", "action": "block", "method": "POST", "fields": ["ip"]},
        {"nome": "Desbloquear IP", "action": "unblock", "method": "POST", "fields": ["ip"]},
        {"nome": "Configurar NAT", "action": "nat", "method": "POST", "fields": ["internalIP", "externalIP"]},
        {"nome": "VPN", "action": "vpn", "method": "POST", "fields": ["enable"]},
        {"nome": "Conexões Ativas", "action": "connections", "method": "GET"},
        {"nome": "Rotas (listar)", "action": "routes", "method": "GET"},
        {"nome": "Rotas (adicionar)", "action": "routes", "method": "POST", "fields": ["destination", "gateway"]},
        {"nome": "Rotas (remover)", "action": "routes", "method": "DELETE", "fields": ["destination"]},
    ]

    st.header("Rotas do Firewall")

    for rota in rotas:
        st.subheader(rota["nome"])
        fields = rota.get("fields", [])
        data = {
            field: (
                st.selectbox(
                    "VPN Ativar?", [True, False], key=f"{rota['nome']}_{field}"
                )
                if field == "enable"
                else st.text_input(f"{field}", key=f"{rota['nome']}_{field}")
            )
            for field in fields
        }
        if st.button(f"Executar {rota['nome']}"):
            url = f"{BASE_URL}?action={rota['action']}"
            try:
                if rota["method"] == "GET":
                    response = requests.get(url)
                elif rota["method"] == "POST":
                    response = requests.post(url, json=data)
                elif rota["method"] == "DELETE":
                    response = requests.delete(url, json=data)
                else:
                    st.error("Método não suportado.")
                    continue

                response.raise_for_status()
                st.code(response.json(), language="json")
            except requests.exceptions.RequestException as e:
                st.error(f"Erro ao consultar {rota['nome']}: {e}")