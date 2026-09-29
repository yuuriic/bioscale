import { isNodeTypeOfDomain, type BiologicalNode } from "./biological-node";
import type { BiologicalRelation } from "./biological-relation";

export type BiologicalGraphIssue =
  | { readonly code: "duplicate_node_id"; readonly nodeId: string }
  | { readonly code: "domain_type_mismatch"; readonly nodeId: string }
  | { readonly code: "invalid_scale"; readonly nodeId: string }
  | { readonly code: "missing_references"; readonly nodeId: string }
  | {
      readonly code: "relation_source_mismatch";
      readonly nodeId: string;
      readonly source: string;
    }
  | {
      readonly code: "unknown_relation_target";
      readonly nodeId: string;
      readonly target: string;
    }
  | { readonly code: "self_relation"; readonly nodeId: string }
  | {
      readonly code: "duplicate_relation";
      readonly nodeId: string;
      readonly relation: BiologicalRelation;
    };

/**
 * Verifica a integridade estrutural de um conjunto de nós.
 *
 * Não valida conteúdo científico — apenas a consistência exigida pelo
 * modelo (ARCHITECTURE.md §4, §7, §8, §16 e §22). Pressupõe entrada já
 * tipada: dados vindos de JSON/CMS exigirão validação de esquema antes.
 */
export function validateBiologicalNodes(
  nodes: readonly BiologicalNode[],
): BiologicalGraphIssue[] {
  const issues: BiologicalGraphIssue[] = [];
  const ids = new Set<string>();

  for (const node of nodes) {
    if (ids.has(node.id)) {
      issues.push({ code: "duplicate_node_id", nodeId: node.id });
    }
    ids.add(node.id);
  }

  for (const node of nodes) {
    if (!isNodeTypeOfDomain(node.type, node.domain)) {
      issues.push({ code: "domain_type_mismatch", nodeId: node.id });
    }

    if (node.scale && !(Number.isFinite(node.scale.magnitude) && node.scale.magnitude > 0)) {
      issues.push({ code: "invalid_scale", nodeId: node.id });
    }

    if (node.educationalContent && node.educationalContent.sources.length === 0) {
      issues.push({ code: "missing_references", nodeId: node.id });
    }

    const declared = new Set<string>();
    for (const relation of node.relations) {
      const key = `${relation.type}\u0000${relation.target}`;
      if (declared.has(key)) {
        issues.push({ code: "duplicate_relation", nodeId: node.id, relation });
      }
      declared.add(key);

      if (relation.target === node.id) {
        issues.push({ code: "self_relation", nodeId: node.id });
      }
      if (relation.source !== node.id) {
        issues.push({
          code: "relation_source_mismatch",
          nodeId: node.id,
          source: relation.source,
        });
      }
      if (!ids.has(relation.target)) {
        issues.push({
          code: "unknown_relation_target",
          nodeId: node.id,
          target: relation.target,
        });
      }
    }
  }

  return issues;
}
