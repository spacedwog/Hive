import streamlit as st
import requests
import subprocess

st.title("Menu Firewall - HIVE")

BASE_URL = "https://hive-chi-woad.vercel.app/api/firewall"

# Rotas e métodos disponíveis
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
            resp_json = response.json()
            # Se for erro de comando de conexões, mostra instrução para executar manualmente
            if (
                rota["action"] == "connections"
                and not resp_json.get("success", True)
                and resp_json.get("error", {}).get("code") == "NETSTAT_ERROR"
            ):
                st.warning(
                    "❗ O comando netstat não está instalado no servidor.\n\n"
                    "Para visualizar as conexões ativas, execute manualmente no Prompt de Comando do Windows:\n\n"
                    "```cmd\nnetstat -ano\n```\n"
                    "O resultado mostrará todas as conexões de rede e os PIDs dos processos.\n\n"
                    "Se precisar de ajuda para interpretar o resultado, copie e cole aqui!"
                )
            st.code(resp_json, language="json")
        except requests.exceptions.RequestException as e:
            st.error(f"Erro ao consultar {rota['nome']}: {e}")
