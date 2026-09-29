/** Aviso de que o estado observável da experiência pode ter mudado. */
export type ExperienceChangeListener = () => void;

/** Controllers cujo estado compõe a observação da experiência. */
interface ObservableStateSource {
  getState(): unknown;
}

export interface ExperienceChangeNotifier {
  subscribe(listener: ExperienceChangeListener): () => void;
  /**
   * Envolve um objeto exposto pelo runtime: cada chamada de método é uma
   * operação observada. Tipo, métodos e `instanceof` são preservados.
   */
  observe<T extends object>(target: T): T;
}

/**
 * Fronteira mínima de notificação do ExperienceRuntime (ARCHITECTURE.md §11.6).
 *
 * Uma operação é qualquer chamada de método num objeto observado. A mudança é
 * detectada pela identidade dos estados das fontes antes e depois da
 * operação: os controllers já preservam a referência em operações sem
 * efeito. Regras:
 * - notificação síncrona, sem payload, no máximo uma por operação; chamadas
 *   aninhadas (dentro de uma operação em curso) pertencem à operação externa;
 * - sem mudança, nenhuma notificação; uma operação que falha sem mudar estado
 *   não notifica e seu erro é propagado sem alteração;
 * - cada `subscribe` é uma inscrição independente, inclusive do mesmo
 *   listener; `unsubscribe` remove só a sua e é idempotente;
 * - a emissão percorre as inscrições existentes no seu início; uma inscrição
 *   removida durante a emissão não é mais chamada;
 * - todos os listeners são chamados mesmo se algum lançar; depois, o erro é
 *   relançado (vários: `AggregateError`). O estado já está consolidado e as
 *   próximas notificações não são afetadas. Se a própria operação falhou, o
 *   erro dela prevalece;
 * - mutações feitas por um listener são novas operações, notificadas de
 *   forma síncrona e aninhada antes de a emissão atual continuar.
 */
export function createExperienceChangeNotifier(
  sources: readonly ObservableStateSource[],
): ExperienceChangeNotifier {
  const subscriptions = new Set<{ readonly listener: ExperienceChangeListener }>();
  let operationInProgress = false;

  const readStates = () => sources.map((source) => source.getState());

  const notify = (): unknown[] => {
    const errors: unknown[] = [];
    for (const subscription of [...subscriptions]) {
      if (!subscriptions.has(subscription)) {
        continue;
      }
      try {
        subscription.listener();
      } catch (error) {
        errors.push(error);
      }
    }
    return errors;
  };

  const run = <R>(operation: () => R): R => {
    if (operationInProgress) {
      return operation();
    }
    const before = readStates();
    operationInProgress = true;
    let result: R;
    try {
      result = operation();
    } catch (error) {
      operationInProgress = false;
      if (hasChanged(before, readStates())) {
        notify();
      }
      throw error;
    }
    operationInProgress = false;
    if (hasChanged(before, readStates())) {
      const errors = notify();
      if (errors.length === 1) {
        throw errors[0];
      }
      if (errors.length > 1) {
        throw new AggregateError(errors, "Experience change listeners failed.");
      }
    }
    return result;
  };

  return {
    subscribe(listener) {
      const subscription = { listener };
      subscriptions.add(subscription);
      return () => {
        subscriptions.delete(subscription);
      };
    },
    observe(target) {
      return new Proxy(target, {
        get(object, key) {
          const value: unknown = Reflect.get(object, key, object);
          if (typeof value !== "function") {
            return value;
          }
          return (...args: unknown[]) => run(() => Reflect.apply(value, object, args));
        },
      });
    },
  };
}

function hasChanged(before: readonly unknown[], after: readonly unknown[]): boolean {
  return before.some((state, index) => state !== after[index]);
}
