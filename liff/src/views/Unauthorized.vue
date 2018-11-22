<template>
  <v-dialog />
</template>

<script>
export default {
  name: "unauthorized",
  data: function() {
    return {};
  },
  components: {},
  mounted: function() {
    liff.init(
      data => {
        this.$modal.show("dialog", {
          text:
            "このリンクは各プレイヤー専用のものです。自分の番に送られてくるリンクをクリックしてください。",
          buttons: [
            {
              title: "とじる",
              handler: () => {
                liff.closeWindow();
              }
            }
          ]
        });
      },
      err => {
        this.$modal.show("dialog", {
          text:
            "このリンクは各プレイヤー専用のものです。自分の番に送られてくるリンクをクリックしてください。",
          buttons: [
            {
              title: "とじる",
              handler: () => {
                liff.closeWindow();
              }
            }
          ]
        });
      }
    );
  }
};
</script>

<style>
</style>
