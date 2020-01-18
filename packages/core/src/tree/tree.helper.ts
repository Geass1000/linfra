import { TreeNode } from './tree-node';
import { Tree } from './tree';

export class TreeHelper {
  addNodeOrTreeToNode <TNData> (
    node: TreeNode<TNData>,
    newNodeOrTree: TreeNode<TNData> | Tree<TNData>,
  ): void {
    const newNode: TreeNode<TNData> = newNodeOrTree instanceof Tree
      ? newNodeOrTree.root
      : newNodeOrTree;

    node.addChild(newNode);
  }

  removeNodeOrTreeFromNode <TNData> (
    node: TreeNode<TNData>,
    nodeOrTreeForRemoving: TreeNode<TNData> | Tree<TNData>,
  ): void {
    const nodeForRemoving: TreeNode<TNData> = nodeOrTreeForRemoving instanceof Tree
      ? nodeOrTreeForRemoving.root
      : nodeOrTreeForRemoving;

    node.removeChild(nodeForRemoving);
  }
}
