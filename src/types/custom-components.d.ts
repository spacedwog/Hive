declare module '/components/*' {
  import { ComponentType } from 'react';
  const Component: ComponentType<any>;
  export default Component;
}

declare module '/hooks/*' {
  const hook: any;
  export default hook;
}

declare module '/constants/*' {
  const constant: any;
  export default constant;
}