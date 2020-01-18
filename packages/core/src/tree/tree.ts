import { TreeNode } from './tree-node';
import { PostorderIterator, PreorderIterator } from './interators';

export class Tree<TNData = any> {
  public get root (): TreeNode<TNData> {
    return this.rootNode;
  }

  constructor (
    private rootNode: TreeNode<TNData>,
  ) { }

  public getPreorderIterator (): PreorderIterator<TNData> {
    return new PreorderIterator<TNData>(this.root);
  }

  public getPostorderIterator (): PostorderIterator<TNData> {
    return new PostorderIterator<TNData>(this.root);
  }

  public getInorderIterator (): any {
  }
}
