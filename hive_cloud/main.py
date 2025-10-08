import streamlit as st
from vercel_client import VercelClient
from projects import Projects
from deployments import Deployments
from domains import Domains
import requests
import json

st.set_page_config(page_title="Hive Cloud Dashboard", layout="wide")

# 🔹 Token FIXO
token = "Awk6YFryd6vv6IPddje7eJbR"  # Substitua pelo seu token real

# Sidebar para navegação entre páginas
pagina = st.sidebar.selectbox(
    "Selecione a página:",
    ["Dashboard Vercel", "Firewall HIVE"]
)

if pagina == "Dashboard Vercel":
    st.title("Vercel API Dashboard")
    if token:
        client = VercelClient(token)
        projects_api = Projects(client)
        deployments_api = Deployments(client)
        domains_api = Domains(client)

        st.header("Projetos")
        if st.button("Listar Projetos"):
            projects = projects_api.list_projects()
            st.code(json.dumps(projects, indent=2, ensure_ascii=False), language="json")

        st.header("Deployments")
        projects = projects_api.list_projects()
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
                    st.code(json.dumps(deployments, indent=2, ensure_ascii=False), language="json")
                except requests.exceptions.HTTPError as e:
                    st.error(f"Erro na requisição: {e.response.status_code} - {e.response.text}")
                except Exception as e:
                    st.error(f"Erro: {str(e)}")
            else:
                st.warning("Nenhum projeto disponível para listar os deployments.")

        st.header("Domínios")
        if st.button("Listar Domínios"):
            domains = domains_api.list_domains()
            st.code(json.dumps(domains, indent=2, ensure_ascii=False), language="json")

elif pagina == "Firewall HIVE":
    import subprocess

    st.title("Menu Firewall - HIVE")
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
    menu_acao = st.sidebar.radio(
        "Escolha a ação do Firewall:",
        [rota["nome"] for rota in rotas]
    )

    # Botão para executar netstat -ano localmente no Windows
    if st.button("Executar netstat -ano (local Windows)"):
        try:
            result = subprocess.run(
                ["netstat", "-ano"],
                capture_output=True,
                text=True,
                shell=True
            )
            if result.returncode == 0:
                st.success("Resultado do comando netstat -ano:")
                st.code(result.stdout, language="text")
            else:
                st.error(f"Erro ao executar netstat: {result.stderr}")
        except Exception as e:
            st.error(f"Falha ao executar netstat: {str(e)}")

    rota_selecionada = next((r for r in rotas if r["nome"] == menu_acao), None)
    if rota_selecionada:
        st.subheader(rota_selecionada["nome"])
        fields = rota_selecionada.get("fields", [])
        data = {
            field: (
                st.selectbox(
                    "VPN Ativar?", [True, False], key=f"{rota_selecionada['nome']}_{field}"
                )
                if field == "enable"
                else st.text_input(f"{field}", key=f"{rota_selecionada['nome']}_{field}")
            )
            for field in fields
        }
        if st.button(f"Executar {rota_selecionada['nome']}"):
            url = f"{BASE_URL}?action={rota_selecionada['action']}"
            try:
                if rota_selecionada["method"] == "GET":
                    response = requests.get(url)
                elif rota_selecionada["method"] == "POST":
                    response = requests.post(url, json=data)
                elif rota_selecionada["method"] == "DELETE":
                    response = requests.delete(url, json=data)
                else:
                    st.error("Método não suportado.")
                response.raise_for_status()
                resp_json = response.json()
                # Se for erro de comando de conexões, mostra mensagem amigável
                if (
                    rota_selecionada["action"] == "connections"
                    and not resp_json.get("success", True)
                    and resp_json.get("error", {}).get("code") == "NETSTAT_ERROR"
                ):
                    st.warning(
                        "Não foi possível obter conexões ativas: comandos netstat e ss não estão instalados no servidor. "
                        "Peça ao administrador para instalar um deles para usar esta funcionalidade."
                    )
                st.code(json.dumps(resp_json, indent=2, ensure_ascii=False), language="json")
            except requests.exceptions.RequestException as e:
                st.error(f"Erro ao consultar {rota_selecionada['nome']}: {e}")