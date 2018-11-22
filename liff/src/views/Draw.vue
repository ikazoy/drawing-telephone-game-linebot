<template>
  <div>
    <loading :active.sync="isLoading" :can-cancel="canCancel" :is-full-page="isFullPage">
    </loading>
    <div>{{ payload }}</div>
    <VueSignaturePad width="100%" :height="height" ref="signaturePad" :options="options" saveType="image/jpeg" />
    <div>
      <button class="btn btn-primary" type="button" @click="saveImage">
        送信
      </button>
      <div class="divider" />
      <button class="btn btn-primary" type="button" @click="undo">戻る</button>
      <div class="countdown-timer">
        残り時間
        <Countdown @timeuped.once="timeup" />
      </div>
    </div>
  </div>
</template>

<script>
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue/dist/bootstrap-vue.css";
import Loading from "vue-loading-overlay";
// @ is an alias to /src
import Countdown from "@/components/Countdown.vue";
import "vue-loading-overlay/dist/vue-loading.css";
console.log(process.env.API_BASE_URL);

export default {
  name: "home",
  data: function() {
    return {
      payload: "",
      isLoading: false,
      userId: null,
      bundleId: null,
      canCancel: false,
      isFullPage: true,
      timeuped: false,
      height: `${window.innerHeight - 50}px`,
      options: {
        backgroundColor: "rgb(232,232,232)"
      }
    };
  },
  components: {
    Loading,
    Countdown
  },
  mounted: function() {
    const query = this.$route.query;
    liff.init(
      function(data) {
        this.userId = data.context.userId;
        this.bundleId =
          data.context.type === "room"
            ? data.context.roomId
            : data.context.type === "group"
              ? data.context.groupId
              : null;
      },
      err => {
        // LIFF initialization failed
        // console.log(err);
        // alert(err);
        // next("/");
      }
    );
    this.payload = query.payload;
  },
  methods: {
    timeup() {
      this.timeuped = true;
      this.saveImage();
    },
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
      let { isEmpty, data } = this.$refs.signaturePad.saveSignature();
      if (isEmpty && !this.timeuped) {
        alert("なにか書いてください");
        this.isLoading = false;
        return;
      } else if (isEmpty && this.timeuped) {
        // TODO: スキップ処理(skip用のendpoint)
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
</style>
