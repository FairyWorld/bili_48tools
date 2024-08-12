import type { NodePath, Node } from '@babel/core';
import type {
  Program,
  Statement,
  ClassMethod,
  ClassPrivateMethod,
  ClassProperty,
  ClassPrivateProperty,
  ClassAccessorProperty,
  TSDeclareMethod,
  TSIndexSignature,
  StaticBlock,
  Expression,
  ClassBody,
  ObjectTypeAnnotation,
  EnumBooleanBody,
  EnumNumberBody,
  EnumStringBody,
  EnumSymbolBody,
  TSTypeElement,
  TSInterfaceBody,
  TSModuleBlock
} from '@babel/types';
import type { BabelTypes } from '../types.cjs';
import type { ImportInfo, ImportSpecifierItem } from './ImportInfo.cjs';

/**
 * 修改绑定和引用
 * @param { NodePath<Program> } path - import节点路径
 * @param { ImportInfo } importInfo - 导入信息
 */
export function variableRename(path: NodePath<Program>, importInfo: ImportInfo): void {
  const exportDefault: '.default' | '' = importInfo.exportDefault ? '.default' : '';

  importInfo.variableName.forEach((variableName: string): void => {
    path.scope.rename(variableName, `${ importInfo.formatVariableName }${ exportDefault }`);
  });

  if (importInfo.specifier.length) {
    importInfo.specifier.forEach(([a, b]: ImportSpecifierItem) => {
      path.scope.rename(b ?? a, `${ importInfo.formatVariableName }.${ a }`);
    });
  }
}

export type ClassBodyArray = Array<ClassMethod | ClassPrivateMethod | ClassProperty | ClassPrivateProperty | ClassAccessorProperty | TSDeclareMethod | TSIndexSignature | StaticBlock>;
export type FindScopeBody = ClassBodyArray | Expression | Array<Statement> | ClassBody | ObjectTypeAnnotation
  | Statement | EnumBooleanBody | EnumNumberBody | EnumStringBody | EnumSymbolBody | Program | Array<TSTypeElement>
  | TSInterfaceBody | TSModuleBlock | undefined;

export interface FindScopeReturn {
  path: NodePath;
  body: FindScopeBody;
}

/**
 * 查找作用域
 * @param { BabelTypes } t
 * @param { NodePath } path
 */
export function findScope(t: BabelTypes, path: NodePath): FindScopeReturn {
  let scopePath: NodePath = path.scope.path;
  let scopeBody: FindScopeBody = ('body' in scopePath.node) ? scopePath.node.body : undefined;

  if (scopeBody && ('body' in scopeBody)) {
    scopeBody = scopeBody.body;
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (Array.isArray(scopeBody) || t.isFile(scopePath.parentPath?.node) || !scopePath.parentPath) {
      break;
    }

    scopePath = scopePath.parentPath;
    scopeBody = scopePath.node?.['body']?.['body'] ?? scopePath.node?.['body'];
  }

  return { path: scopePath, body: scopeBody };
}

export type FindParentScopeReturn = Partial<FindScopeReturn>;

/**
 * 查找父级作用域
 * @param { NodePath | undefined } path
 */
export function findParentScope(path: NodePath | undefined): FindParentScopeReturn {
  const parentScopePath: NodePath | undefined = path?.parentPath ?? undefined;
  let parentScopeBody: FindScopeBody = (parentScopePath && ('body' in parentScopePath.node)) ? parentScopePath.node.body : undefined;

  if (parentScopeBody && ('body' in parentScopeBody)) {
    parentScopeBody = parentScopeBody.body;
  }

  return { path: parentScopePath, body: parentScopeBody };
}

/**
 * 判断body中是否存在对应的表达式
 * @param { BabelTypes } t
 * @param { Array<Node> } body
 * @param { string } name
 * @param { Node } [node]
 */
export function hasExpressionStatement(t: BabelTypes, body: Array<Node>, name: string, node?: Node): boolean {
  return body.some((o: Node): boolean => t.isExpressionStatement(o)
    && o !== node
    && t.isAssignmentExpression(o.expression, { operator: '??=' })
    && t.isIdentifier(o.expression.left, { name }));
}

/**
 * 判断是ClassDeclaration并修改StaticBlock
 * @param { BabelTypes } t
 * @param { FindScopeReturn } findScopeResult
 */
export function isClassDeclarationAndModifiedStaticBlock(t: BabelTypes, findScopeResult: FindScopeReturn): ClassBodyArray | undefined {
  const findScopeResultNodePath: Node = findScopeResult.path.node;

  if (t.isClassDeclaration(findScopeResultNodePath)) {
    const classBody: Array<ClassBody> = findScopeResult.body as unknown as Array<ClassBody>;

    if (!t.isStaticBlock(classBody[0])) {
      classBody.unshift(t.staticBlock([]) as any);
    }

    return classBody[0].body;
  }
}