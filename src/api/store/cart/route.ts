import { CartService, MedusaRequest, MedusaResponse } from '@medusajs/medusa';

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const cartService = req.scope.resolve<CartService>('cartService');

  try {
    const carts = await cartService.list({});
    res.json({
      message: 'List all carts successfully',
      carts,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const cartId = req.query.cartId;

  const cartService = req.scope.resolve<CartService>('cartService');

  try {
    const cart = await cartService.retrieve(cartId as string);

    if (!cart) {
      res.status(404).json({ error: 'Cart not found' });
      return;
    }

    await cartService.delete(cart?.id);
    res.json({
      message: 'Cart deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
