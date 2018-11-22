<template>
  <span class="blink" :class="{ warning: warned }">00:{{ left }}</span>
</template>

<script>
export default {
  name: "Countdown",
  props: {
    initialLeft: {
      type: Number,
      default: 60
    },
    // in millisec
    interval: {
      type: Number,
      default: 1000
    }
  },
  data: function() {
    return {
      left: this.initialLeft,
      warningThreshold: 20
    };
  },
  methods: {
    startTimer() {
      setInterval(() => {
        this.left -= 1;
        // can be replaced with watch
        this.timeUped;
      }, this.interval);
    }
  },
  mounted: function() {
    this.startTimer();
  },
  computed: {
    warned: function() {
      return this.left <= this.warningThreshold ? true : false;
    },
    timeUped: function() {
      if (this.left <= 0) {
        return this.$emit("timeuped");
      }
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
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
.blink {
  animation: blink 1s ease-out;
  -webkit-animation: blink 1s step-end infinite;
}
</style>
