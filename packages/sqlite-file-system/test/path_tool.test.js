let SFS = require("../");

test("file path parse", () => {
    let info = SFS.PathTool.parseFilePath("");
    expect(info).toEqual({ fileName: "", parentPath: "/", extension: "", fullPath: "/", validate: false });
    info = SFS.PathTool.parseFilePath("/");
    expect(info).toEqual({ fileName: "", parentPath: "/", extension: "", fullPath: "/", validate: false });
    info = SFS.PathTool.parseFilePath("////");
    expect(info).toEqual({ fileName: "", parentPath: "/", extension: "", fullPath: "/", validate: false });
    info = SFS.PathTool.parseFilePath("/a/");
    expect(info.validate).toEqual(false);

    info = SFS.PathTool.parseFilePath("/a.txt");
    expect(info).toEqual({ fileName: "a.txt", parentPath: "/", extension: "txt", fullPath: "/a.txt", validate: true });
    info = SFS.PathTool.parseFilePath("\\a.txt");
    expect(info).toEqual({ fileName: "a.txt", parentPath: "/", extension: "txt", fullPath: "/a.txt", validate: true });


    info = SFS.PathTool.parseDirPath("\\a.txt/");
    expect(info).toEqual({ fullPath: "/a.txt/", fileName: "a.txt", parentPath: "/" });
    info = SFS.PathTool.parseDirPath("\\a.txt");
    expect(info).toEqual({ fullPath: "/a.txt/", fileName: "a.txt", parentPath: "/" });
    info = SFS.PathTool.parseDirPath("\\floder\\floderb");
    expect(info).toEqual({ fullPath: "/floder/floderb/", fileName: "floderb", parentPath: "/floder/" });
    info = SFS.PathTool.parseDirPath("\\floder\\floderb/floderc/");
    expect(info).toEqual({ fullPath: "/floder/floderb/floderc/", fileName: "floderc", parentPath: "/floder/floderb/" });

});