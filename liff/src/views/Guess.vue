<template>
  <div>
    <loading :active.sync="isLoading" :can-cancel="canCancel" :is-full-page="isFullPage">
    </loading>
    <div>
      {{ payload }}
    </div>
    <VueSignaturePad width="100%" :height="height" ref="signaturePad" :options="options" saveType="image/jpeg" />
    <div>
      <button class="btn btn-primary" type="button" @click="saveImage">送信</button>
      <div class="divider" />
      <button class="btn btn-primary" type="button" @click="undo">戻る</button>
      <span class="countdown-timer">
        残り時間
      </span>
      <span class="blink" :class="{warning:warned}">
        {{ leftSec }}
      </span>
    </div>
  </div>
</template>

<script>
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue/dist/bootstrap-vue.css";
import Loading from "vue-loading-overlay";
import "vue-loading-overlay/dist/vue-loading.css";
console.log(process.env.API_BASE_URL);

// @ is an alias to /src
// import HelloWorld from "@/components/HelloWorld.vue";

export default {
  name: "home",
  data: function() {
    return {
      payload: "",
      leftSec: 60,
      isWarning: 20,
      isLoading: false,
      userId: null,
      bundleId: null,
      canCancel: false,
      isFullPage: true,
      height: `${window.innerHeight - 50}px`,
      options: {
        backgroundColor: "rgb(232,232,232)"
      }
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
        if (
          bundleIdInParams === this.bundleId &&
          userIdInParams === this.userId
        ) {
          console.log("matched");
          next();
        } else {
          console.log("no matched");
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
    const query = this.$route.query;
    this.payload = query.payload;
    this.startTimer();
  },
  methods: {
    undo() {
      this.$refs.signaturePad.undoSignature();
    },
    async saveImage() {
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
        alert("なにか書いてください");
        this.isLoading = false;
        return;
      }
      const res = await this.axios.post(
        `${process.env.API_BASE_URL}/saveimage`,
        {
          image: data,
          bundleId,
          gameId,
          currentIndex,
          userId
        }
      );
      this.isLoading = false;
      console.log("success", res);
      const d = res.data;
      if (!d.success) {
        window.alert("request to /saveimage failed.");
        window.alert(d.message);
      }
      // if (userId != null && liff && typeof liff.getProfile === "function") {
      if (true) {
        try {
          // const profile = await liff.getProfile();
          const nextMessage = await this.axios.get(
            `${process.env.API_BASE_URL}/nextmessage`,
            {
              params: {
                bundleId,
                nextIndex: Number(currentIndex) + 1
              }
            }
          );
          console.log("nextMessage", nextMessage);
          // TODO: validate nextMessage with nextMessage.data.success
          liff
            .sendMessages([nextMessage.data.publicMessage])
            .then(function() {
              liff.closeWindow();
            })
            .catch(function(error) {
              window.alert("Error sending message: " + error.message);
            });
        } catch (err) {
          window.alert("Error getting profile and sending message: " + err);
        }
      } else {
        console.log("closing liff window");
      }
      setTimeout(function() {
        this.isLoading = false;
      }, 10000);
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
