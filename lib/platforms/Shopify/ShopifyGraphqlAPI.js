// import { ProjectApiClient, grapfqlQuery, CallStack } from 'artiloft';
// import { ShopifyObject } from './ShopifyObject.js';

// export class ShopifyGraphqlAPI extends ProjectApiClient {
//     #project;
//     constructor(project) {
//         super(project.config());
//         this.#project = project;
//     }
//     createShopifyObject(type, data = {}) {
//         const obj = new ShopifyObject(this.#project, type, data);
//         return obj;
//     }
    
//     async query(name) {
//         const originProject = CallStack.getProject();
//         const originGraphqlPath = this.#project.path(`../${originProject}/graphql`);
//         return await grapfqlQuery.query(name, originGraphqlPath)
//     }
// }