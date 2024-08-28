import { CartService, MedusaRequest, MedusaResponse } from '@medusajs/medusa';

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const cartId = req.query.cartId;
  const key = req.query.key as string;
  const value = req.query.value as string | number;

  const cartService = req.scope.resolve<CartService>('cartService');

  try {
    const cart = await cartService.retrieve(cartId as string);

    if (!cart) {
      res.status(404).json({ error: 'Cart not found' });
      return;
    }

    await cartService.setMetadata(cart?.id, key, value);
    res.json({
      message: 'Update cart metadata successfully',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
