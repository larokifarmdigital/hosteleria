import { Callout } from './Callout';

export function ReadOnlyNotice({ className }: { className?: string }) {
  return (
    <Callout title="De momento, solo consulta" className={className}>
      Aquí ves el contenido tal como está guardado. La edición desde esta pantalla llegará en la siguiente versión.
    </Callout>
  );
}
