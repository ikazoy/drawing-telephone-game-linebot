<template lang="pug">
  div
    loading(:active.sync="isLoading",can-cancel=false, is-full-page=true)
    VueSignaturePad(width="500px", height="500px", ref ="signaturePad")
    div
      button.btn.btn-primary(type="button", @click="saveImage") 送信
      .divider
      button.btn.btn-primary(type="button", @click="undo") 一つ戻る
      span.countdown-timer 残り時間
        span.blink(:class="{warning:warned}") {{ leftSec }}
</template>

<script>
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue/dist/bootstrap-vue.css";
import Loading from "vue-loading-overlay";
import "vue-loading-overlay/dist/vue-loading.css";

// @ is an alias to /src
// import HelloWorld from "@/components/HelloWorld.vue";

export default {
  name: "home",
  data: function() {
    return {
      leftSec: 60,
      isWarning: 20,
      isLoading: false,
      userId: null,
      bundleId: null
    };
  },
  components: {
    Loading
  },
  async beforeRouteEnter(to, from, next) {
    const params = new URL(document.location).searchParams;
    const bundleIdInParams =
      params != null && params.has("bundleId") ? params.get("bundleId") : null;
    const userIdInParams =
      params != null && params.has("userId") ? params.get("userId") : null;
    alert("here");
    liff.init(
      function(data) {
        alert(JSON.stringify(data));
        // console.log(JSON.stringify(data));
        // Now you can call LIFF API
        this.userId = data.context.userId;
        this.bundleId =
          data.context.type === "room"
            ? data.context.roomId
            : data.context.type === "group"
              ? data.context.groupId
              : null;
        alert(this.userId);
        alert(this.bundleId);
        alert(bundleIdInParams);
        if (
          bundleIdInParams === this.bundleId &&
          userIdInParams === this.userId
        ) {
          console.log("matched");
          next();
        } else {
          console.log("no matched");
          next("/");
        }

        // if (can) {
        //   next();
        // }
      },
      err => {
        // LIFF initialization failed
        // console.log(err);
        alert(err);
        next("/");
      }
    );
    // alert("outside");
    // next("");
    // .catch(function(error) {
    //   window.alert("Error getting profile: " + error.message);
    // });
  },
  computed: {
    warned: function() {
      return this.leftSec <= this.isWarning ? true : false;
    }
  },
  mounted: function() {
    this.startTimer();
  },
  methods: {
    undo() {
      this.$refs.signaturePad.undoSignature();
    },
    saveImage() {
      this.isLoading = true;
      const params = new URL(document.location).searchParams;
      const bundleId =
        params != null && params.has("bundleId")
          ? params.get("bundleId")
          : null;
      const gameId =
        params != null && params.has("bundleId") ? params.get("gameId") : null;
      const userId =
        params != null && params.has("userId") ? params.get("userId") : null;
      const currentIndex =
        params != null && params.has("currentIndex")
          ? params.get("currentIndex")
          : null;
      const { isEmpty, data } = this.$refs.signaturePad.saveSignature();
      if (isEmpty) {
        alert("empty image");
        return;
      }
      this.axios
        .post(`${process.env.API_BASE_URL}/saveimage`, {
          image: data,
          bundleId,
          gameId,
          currentIndex,
          userId
        })
        .then(function(res) {
          this.isLoading = false;
          console.log("success", res);
          const d = res.data;
          if (!d.success) {
            window.alert("request to /saveimage failed.");
            window.alert(d.message);
          }
          if (userId != null) {
            liff
              .getProfile()
              .then(function(profile) {
                liff
                  .sendMessages([
                    {
                      type: "image",
                      originalContentUrl: d.filePath,
                      previewImageUrl: d.filePath
                    }
                  ])
                  .then(function() {
                    liff.closeWindow();
                  })
                  .catch(function(error) {
                    window.alert("Error sending message: " + error.message);
                  });
              })
              .catch(function(error) {
                window.alert("Error getting profile: " + error.message);
              });
          } else {
            console.log("closing liff window");
          }
        })
        .catch(function(error) {
          this.isLoading = false;
          console.log("error", error);
        });
    },
    // startTimer(duration, display, callback) {
    startTimer() {
      // in millisecond
      const interval = 1000;
      setInterval(() => {
        this.leftSec += -1;
      }, interval);
    }
  }
};
</script>

<style>
table {
  width: 100%;
}
.divider {
  width: 15px;
  height: auto;
  display: inline-block;
}
.countdown-timer {
  float: right;
}
@keyframes blink {
  75% {
    opacity: 0;
  }
}
@-webkit-keyframes blink {
  75% {
    opacity: 0;
  }
}
.warning {
  color: red;
}
.countdown-timer {
  float: right;
}
.blink {
  animation: blink 1s ease-out;
  -webkit-animation: blink 1s step-end infinite;
}
</style>
