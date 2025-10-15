import SustainabilityManager from '../hive_sustain/SustainabilityManager.ts';

export class GitHubIssueService {
  private token: string;
  private owner: string;
  private repo: string;
  private sustainManager: SustainabilityManager;

  constructor(token: string, owner: string, repo: string) {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.sustainManager = SustainabilityManager.getInstance();
    console.log('🌱 GitHubIssueService inicializado com sustentabilidade');
  }

  async abrirIssue(titulo: string, corpo: string, labels: string[]): Promise<number | null> {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/issues`;
    
    try {
      console.log('📝 Abrindo issue com sustentabilidade...');
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `token ${this.token}`,
          "Accept": "application/vnd.github.v3+json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: titulo,
          body: corpo,
          labels: labels
        })
      });
      
      if (response.status === 201) {
        const data = await response.json();
        // Invalida cache de issues após criar nova
        this.sustainManager.invalidateCache(`https://api.github.com/repos/${this.owner}/${this.repo}/issues`);
        return data.number;
      }
      return null;
    } catch (error) {
      console.error('❌ Erro ao abrir issue:', error);
      return null;
    }
  }
  
  async fecharIssue(numero: number): Promise<boolean> {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/issues/${numero}`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Authorization": `token ${this.token}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ state: "closed" })
    });
    return response.status === 200;
  }

  async listarIssues(): Promise<any[]> {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/issues`;
    
    try {
      // Usa cache do SustainabilityManager (30s de cache)
      const data = await this.sustainManager.cachedRequest<any[]>(
        url,
        {
          method: "GET",
          headers: {
            "Authorization": `token ${this.token}`,
            "Accept": "application/vnd.github.v3+json"
          }
        },
        30000 // 30s de cache
      );
      
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('❌ Erro ao listar issues:', error);
      return [];
    }
  }

  async editarIssue(
    numero: number,
    titulo: string,
    corpo: string,
    labels: string[],
    status: "open" | "closed"
  ): Promise<boolean> {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/issues/${numero}`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Authorization": `token ${this.token}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: titulo,
        body: corpo,
        labels: labels,
        state: status
      })
    });
    return response.status === 200;
  }
}