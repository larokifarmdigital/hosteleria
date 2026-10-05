export const config = { runtime: 'nodejs' };
export default function handler(req: any, res: any) {
  res.status(200).json({ hello: 'from nested catch-all', url: req.url });
}
