<template>
  <div v-if="!answered">
    <loading :active.sync="isLoading" :can-cancel="canCancel" :is-full-page="isFullPage">
    </loading>
    <picture>
      <source class="drawing" :srcset="payload" />
      <img class="drawing" :src="payload" />
    </picture>
    <div class="centerize-column-container">
      <input class="answer-input" v-model="answer" type="text" placeholder="答えを入力してください" />
      <button class="btn btn-primary medium-button" type="button" @click="saveAnswer">送信</button>
    </div>
    <div class="countdown-timer">
      残り時間
      <Countdown @timeuped.once="timeup" :initialLeft="30" />
    </div>
  </div>
  <div v-else>すでに回答済みです</div>
</template>

<script>
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue/dist/bootstrap-vue.css";
import Loading from "vue-loading-overlay";
import Countdown from "@/components/Countdown.vue";
import "vue-loading-overlay/dist/vue-loading.css";

// @ is an alias to /src
// import HelloWorld from "@/components/HelloWorld.vue";

export default {
  name: "guess",
  data: function() {
    return {
      payload: "",
      isLoading: false,
      userId: null,
      bundleId: null,
      canCancel: false,
      isFullPage: true,
      answer: "",
      answered: true,
      imageUrl: ""
    };
  },
  components: {
    Loading,
    Countdown
  },
  mounted: function() {
    const query = this.$route.query;
    this.answered = query.answered;
    this.imageUrl = query.imageUrl;
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
    this.startTimer();
  },
  methods: {
    async saveAnswer() {
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
      if (
        this.answer === "" ||
        this.answer === undefined ||
        this.answer === null
      ) {
        alert("答えが空白です。");
        this.isLoading = false;
        return;
      }
      const res = await this.axios.post(
        `${process.env.API_BASE_URL}/saveimage`,
        {
          text: this.answer,
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
        window.alert(JSON.stringify(d.message));
        this.isLoading = false;
        return;
      }
      if (userId != null && liff && typeof liff.getProfile === "function") {
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
            .sendMessages(nextMessage.data.publicMessage)
            .then(function() {
              liff.closeWindow();
            })
            .catch(function(error) {
              window.alert(
                "Error sending message: " + error.message + error.code
              );
            });
        } catch (err) {
          window.alert("Error getting profile and sending message: " + err);
        }
      } else {
        console.log("closing liff window");
        liff.closeWindow();
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
.drawing {
  width: 95vw;
  /* height: 80vw; */
  /* max-height: 80vw; */
  margin-bottom: 10px;
}

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
  margin-right: 10px;
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
.centerize-column-container {
  display: flex;
  flex-flow: column nowrap;
  justify-content: space-between;
  align-items: center;
}
.medium-button {
  width: 30vw;
}
.blink {
  animation: blink 1s ease-out;
  -webkit-animation: blink 1s step-end infinite;
}
.answer-input {
  margin-bottom: 8px;
}
</style>
