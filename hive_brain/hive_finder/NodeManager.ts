import { Node } from './Node';
import { NodeStatus } from './NodeStatus';

export class NodeManager {
  nodes: Node[];

  constructor(nodes: Node[]) {
    this.nodes = nodes;
  }

  async fetchAllStatus(): Promise<Record<string, NodeStatus>> {
    const status: Record<string, NodeStatus> = {};
    await Promise.all(
      this.nodes.map(async (node) => {
        status[node.name] = await node.fetchStatus();
      })
    );
    return status;
  }

  getNodeByName(name: string): Node | undefined {
    return this.nodes.find((n) => n.name === name);
  }
}