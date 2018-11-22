import Vue from "vue";
import VueSignaturePad from "vue-signature-pad";
import BootstrapVue from "bootstrap-vue";
import axios from "axios";
import VueAxios from "vue-axios";
import VModal from "vue-js-modal";

import App from "./App.vue";
import router from "./router";

Vue.config.productionTip = false;

Vue.use(VueAxios, axios);
Vue.use(BootstrapVue);
Vue.use(VueSignaturePad);
Vue.use(VModal, { dialog: true });

new Vue({
  router,
  render: h => h(App)
}).$mount("#app");
