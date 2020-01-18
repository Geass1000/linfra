import { TreeNode } from './tree-node';
import { PostorderIterator, PreorderIterator } from './interators';

export class Tree<TN> {
  public get root (): TreeNode<TN> {
    return this.rootNode;
  }

  constructor (
    private rootNode: TreeNode<TN>,
  ) { }

  public getPreorderIterator (): PreorderIterator<TN> {
    return new PreorderIterator<TN>(this.root);
  }

  public getPostorderIterator (): PostorderIterator<TN> {
    return new PostorderIterator<TN>(this.root);
  }

  public getInorderIterator (): any {
  }
}
