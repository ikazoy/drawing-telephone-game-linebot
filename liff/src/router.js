import Vue from "vue";
import Router from "vue-router";
import Home from "./views/Home.vue";

Vue.use(Router);

const router = new Router({
  mode: "history",
  routes: [
    {
      path: "/",
      name: "home",
      component: Home
    },
    {
      path: "/about",
      name: "about",
      // route level code-splitting
      // this generates a separate chunk (about.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () =>
        import(/* webpackChunkName: "about" */ "./views/About.vue")
    },
    {
      path: "/liff",
      beforeEnter: (to, from, next) => {
        // try {
        console.log("to", to.query);
        const params = to.query;
        const bundleIdInParams =
          params != null && params.bundleId ? params.bundleId : null;
        const userIdInParams =
          params != null && params.userId ? params.userId : null;
        liff.init(
          function(data) {
            alert(JSON.stringify(data));
            // console.log(JSON.stringify(data));
            // Now you can call LIFF API
            const userId = data.context.userId;
            const bundleId =
              data.context.type === "room"
                ? data.context.roomId
                : data.context.type === "group"
                ? data.context.groupId
                : null;
            if (bundleIdInParams === bundleId && userIdInParams === userId) {
              alert("matched");
              const { currentIndex } = params.currentIndex;
              if (currentIndex % 2 === 0) {
                next({
                  path: "/draw",
                  query: to.query
                });
              } else {
                next({
                  path: "/guess",
                  query: to.query
                });
              }
            } else {
              alert("no matched");
              // next("/");
              next();
            }
          },
          err => {
            // LIFF initialization failed
            // console.log(err);
            // alert(err);
            // next("/");
            next();
          }
        );
        // } catch (err) {
        //   alert("err", err);
        // } finally {
        //   alert("finally");
        // }
        // alert("outside");
        // next("");
        // .catch(function(error) {
        //   window.alert("Error getting profile: " + error.message);
        // });
      }
    },
    {
      path: "/draw",
      name: "Draw",
      component: () =>
        import(/* webpackChunkName: "about" */ "./views/Draw.vue")
    },
    {
      path: "/guess",
      name: "Guess",
      component: () =>
        import(/* webpackChunkName: "about" */ "./views/Guess.vue")
    }
  ]
});

export default router;
